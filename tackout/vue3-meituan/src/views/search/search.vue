<template>
  <div class="search-page">
    <v-head title="搜索" goBack="true"></v-head>

    <!-- 搜索框 -->
    <div class="search-bar">
      <van-search
        v-model="keyword"
        placeholder="请输入商家 商品名"
        show-action
        action-text="搜索"
        @search="doSearch"
        @click-input="onInputFocus"
        @update:model-value="onInput"
      />
    </div>

    <!-- 历史/热词面板（未搜索时展示） -->
    <div class="suggest-panel" v-if="!hasResult && !isSearching">
      <!-- 历史搜索 -->
      <div class="suggest-section" v-if="historyList.length">
        <div class="suggest-section__header">
          <span class="suggest-section__title">历史搜索</span>
          <van-icon name="delete-o" size="16" color="#999" @click="clearHistory" />
        </div>
        <div class="tag-list">
          <van-tag
            v-for="word in historyList"
            :key="word"
            plain
            class="suggest-tag"
            @click="searchByTag(word)"
          >{{ word }}</van-tag>
        </div>
      </div>

      <!-- 热门搜索 -->
      <div class="suggest-section" v-if="hotKeywords.length">
        <div class="suggest-section__header">
          <span class="suggest-section__title">大家都在搜</span>
        </div>
        <div class="tag-list">
          <van-tag
            v-for="word in hotKeywords"
            :key="word"
            color="#fff7e6"
            text-color="#ff6b00"
            class="suggest-tag"
            @click="searchByTag(word)"
          >{{ word }}</van-tag>
        </div>
      </div>
    </div>

    <!-- 搜索结果：Tab 切换 -->
    <div class="result-area" v-if="hasResult">
      <van-tabs v-model:active="activeTab" color="#ffd161" title-active-color="#333">
        <!-- 商家 Tab -->
        <van-tab :title="`商家 (${restaurants.length})`" name="restaurant">
          <div v-if="restaurants.length" class="restaurant-list">
            <div
              v-for="item in restaurants"
              :key="item.id"
              class="restaurant-row"
              @click="router.push({ path: '/store', query: { id: item.id } })"
            >
              <div class="restaurant-row__avatar">
                <van-image :src="item.pic_url" fit="cover" width="100%" height="100%" radius="8" />
              </div>
              <div class="restaurant-row__info">
                <div class="restaurant-row__name" v-html="highlight(item.name)"></div>
                <div class="restaurant-row__meta">
                  <span>{{ item.delivery_time_tip }}</span>
                  <span>{{ item.shipping_fee_tip }}</span>
                </div>
              </div>
              <van-icon name="arrow" color="#ccc" />
            </div>
          </div>
          <van-empty v-else description="未找到相关商家" />
        </van-tab>

        <!-- 菜品 Tab -->
        <van-tab :title="`菜品 (${foods.length})`" name="food">
          <div v-if="foods.length" class="food-list">
            <div v-for="item in foods" :key="item.id || item._id" class="food-card">
              <van-image
                class="food-card__img"
                :src="item.pic_url"
                fit="cover"
                radius="8"
                width="80"
                height="80"
              />
              <div class="food-card__info">
                <div class="food-card__name" v-html="highlight(item.name)"></div>
                <div class="food-card__tag" v-if="item.tag_list">{{ item.tag_list }}</div>
                <div class="food-card__price">￥{{ item.skus?.[0]?.price ?? item.min_price ?? '--' }}</div>
              </div>
              <van-button
                size="small"
                round
                color="#ffd161"
                class="food-card__btn"
                @click="goToRestaurant(item)"
              >
                立即下单
              </van-button>
            </div>
          </div>
          <van-empty v-else description="未找到相关菜品" />
        </van-tab>
      </van-tabs>
    </div>

    <!-- 搜索中 loading -->
    <div class="search-loading" v-if="isSearching">
      <van-loading type="spinner" color="#ffd161" />
    </div>

    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { searchRestaurant } from '@/api/restaurant'
import { _get } from '@/api/index'

const router = useRouter()

const keyword = ref('')
const restaurants = ref([])
const foods = ref([])
const hasResult = ref(false)
const isSearching = ref(false)
const activeTab = ref('restaurant')
const alertText = ref('')
const showTip = ref(false)

// ── 历史搜索 ──
const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10
const historyList = ref([])

function loadHistory() {
  try {
    historyList.value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { historyList.value = [] }
}

function saveHistory(word) {
  const list = [word, ...historyList.value.filter(w => w !== word)].slice(0, MAX_HISTORY)
  historyList.value = list
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
}

function clearHistory() {
  historyList.value = []
  localStorage.removeItem(HISTORY_KEY)
}

// ── 热门搜索 ──
const DEFAULT_HOT = ['汉堡', '炸鸡', '麻辣烫', '火锅', '奶茶', '披萨', '炒饭', '沙拉']
const hotKeywords = ref([])

async function loadHotKeywords() {
  try {
    const res = await _get({ url: 'v1/search/hot' })
    if (res.data?.status === 200 && res.data.data?.length) {
      hotKeywords.value = res.data.data
    } else {
      hotKeywords.value = DEFAULT_HOT
    }
  } catch {
    hotKeywords.value = DEFAULT_HOT
  }
}

// ── 搜索逻辑 ──
function onInputFocus() { /* 可扩展：显示下拉历史 */ }
function onInput(val) {
  if (!val) { hasResult.value = false }
}

function searchByTag(word) {
  keyword.value = word
  doSearch()
}

function doSearch() {
  const val = keyword.value.trim()
  if (!val) return
  isSearching.value = true
  hasResult.value = false
  saveHistory(val)
  searchRestaurant({ keyword: val }).then((response) => {
    const res = response.data
    if (res.status === 200) {
      // 后端现在返回 {restaurants: [...], foods: [...]}
      const data = res.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        restaurants.value = data.restaurants || []
        foods.value = data.foods || []
      } else {
        // 兼容旧格式（只返回餐馆数组）
        restaurants.value = Array.isArray(data) ? data : []
        foods.value = []
      }
      hasResult.value = true
      // 自动切换到有结果的 tab
      if (restaurants.value.length === 0 && foods.value.length > 0) {
        activeTab.value = 'food'
      } else {
        activeTab.value = 'restaurant'
      }
      if (!restaurants.value.length && !foods.value.length) {
        alertText.value = `未找到「${val}」相关结果，换个词试试`
        showTip.value = true
        hasResult.value = false
      }
    } else {
      alertText.value = res.message || '搜索失败'
      showTip.value = true
    }
  }).finally(() => {
    isSearching.value = false
  })
}

function highlight(value) {
  if (!keyword.value) return value
  const escaped = keyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return value.replace(new RegExp(escaped, 'gi'), m => `<span class="hl">${m}</span>`)
}

function goToRestaurant(food) {
  if (food.restaurant_id) {
    router.push({ path: '/store', query: { id: food.restaurant_id } })
  }
}

onMounted(() => {
  loadHistory()
  loadHotKeywords()
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

.search-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.search-bar {
  background: #fff;
  :deep(.van-search) { padding: 0.2rem 0.2rem; }
}

// ── 推荐面板 ──
.suggest-panel {
  padding: 0.3rem;
}

.suggest-section {
  margin-bottom: 0.4rem;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.2rem;
  }

  &__title {
    font-size: 0.32rem;
    font-weight: bold;
    color: #333;
  }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.16rem;
}

.suggest-tag {
  font-size: 0.28rem !important;
  padding: 0.1rem 0.24rem !important;
  border-radius: 0.4rem !important;
  cursor: pointer;
}

// ── 结果区域 ──
.result-area {
  background: #fff;
  :deep(.van-tabs__line) { background: #ffd161; }
  :deep(.hl) { color: #ffa000; font-weight: bold; }
}

// 商家列表
.restaurant-list { padding: 0 0.3rem; }
.restaurant-row {
  display: flex;
  align-items: center;
  padding: 0.3rem 0;
  border-bottom: 1px solid #f5f5f5;
  gap: 0.3rem;
  cursor: pointer;

  &__avatar {
    @include px2rem(width, 90);
    @include px2rem(height, 90);
    flex-shrink: 0;
    border-radius: 0.16rem;
    overflow: hidden;
    background: #f0f0f0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 0.38rem;
    font-weight: 500;
    color: #222;
    margin-bottom: 0.1rem;
    @include ellipsis;
  }

  &__meta {
    font-size: 0.26rem;
    color: #999;
    display: flex;
    gap: 0.2rem;
  }
}

// 菜品列表
.food-list { padding: 0 0.3rem; }
.food-card {
  display: flex;
  align-items: center;
  padding: 0.3rem 0;
  border-bottom: 1px solid #f5f5f5;
  gap: 0.24rem;

  &__img {
    flex-shrink: 0;
    border-radius: 0.16rem;
    overflow: hidden;
    background: #f0f0f0;
  }

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__name {
    font-size: 0.34rem;
    font-weight: 500;
    color: #222;
    @include ellipsis;
    margin-bottom: 0.06rem;
  }

  &__tag {
    font-size: 0.24rem;
    color: #bbb;
    @include ellipsis;
    margin-bottom: 0.08rem;
  }

  &__price {
    font-size: 0.36rem;
    font-weight: bold;
    color: #fb4e44;
  }

  &__btn {
    flex-shrink: 0;
    font-size: 0.28rem !important;
    color: #333 !important;
    @include px2rem(min-width, 140);
  }
}

// 搜索 loading
.search-loading {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}
</style>
