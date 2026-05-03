<template>
  <div class="nearby-shops">
    <nav>
      <ul>
        <li>综合排序 <i class="iconfont icon-sort">&#xe601;</i></li>
        <li>销量最高</li>
        <li>距离最近</li>
        <li>筛选</li>
      </ul>
    </nav>

    <!-- 商家列表 + 无限滚动 -->
    <van-list
      v-model:loading="loading"
      :finished="noMore"
      finished-text="已经到底了"
      @load="onLoad">
      <section
        v-for="item in shopLists"
        :key="item.id"
        :class="['shop-item', { 'shop-item--unreachable': !item.deliverable }]"
        @click="goToStore(item)">

        <!-- 商家图片 + 超范围蒙层 / 打烊蒙层 -->
        <div class="img-show">
          <van-image :src="item.pic_url" fit="cover" lazy-load width="100%" height="100%" />
          <div v-if="!item.deliverable" class="unreachable-mask">
            <span class="unreachable-icon">🚫</span>
            <span class="unreachable-text">超出配送范围</span>
          </div>
          <div v-else-if="getBusinessStatus(item.shopping_time_start, item.shopping_time_end) === 'closed'" class="closed-mask">
            <span class="closed-text">已打烊</span>
          </div>
          <!-- 活动角标 -->
          <span v-if="activeRestaurantIds.has(item.id)" class="activity-badge">
            {{ flashSaleIds.has(item.id) ? '🔥秒杀' : '⚡限时优惠' }}
          </span>
        </div>

        <!-- 商家信息 -->
        <div class="detail">
          <h4>
            {{ item.name }}
            <span v-if="!item.deliverable" class="unreachable-tag">暂不配送</span>
            <van-tag
              v-else-if="getBusinessStatus(item.shopping_time_start, item.shopping_time_end) === 'opening_soon'"
              type="warning"
              size="small"
              style="margin-left: 4px; vertical-align: middle;"
            >即将开业</van-tag>
          </h4>
          <div class="shops-message">
            <v-star :score="item.wm_poi_score"></v-star>
            <span class="sell-num">{{ item.month_sales_tip }}</span>
            <div class="delivery-info">
              <span class="deliver-time" :class="{ 'deliver-time--far': !item.deliverable }">
                {{ item.delivery_time_tip }}/
              </span>
              <span class="distance" :class="{ 'distance--far': !item.deliverable }">
                {{ item.distance }}
              </span>
            </div>
          </div>
          <div class="price-message">
            <template v-if="!item.deliverable">
              <span class="out-of-range-tip">
                📍 距您约 {{ item.distance }}，超出 30km 配送范围
              </span>
            </template>
            <template v-else>
              <span>{{ item.min_price_tip }} | </span>
              <span>{{ item.shipping_fee_tip }} | </span>
              <span>{{ item.average_price_tip }}</span>
            </template>
          </div>
          <div class="active-message" v-if="item.deliverable && item.discounts2 && item.discounts2.length">
            <ul>
              <li v-for="(discount, index) in item.discounts2.slice(0, 1)" :key="index">
                <div class="discount-left">
                  <img :src="discount.icon_url" class="icon">
                  <span class="info">{{ discount.info }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </van-list>

    <!-- 超范围提示 -->
    <alert-tip :text="tipText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAddressStore } from '@/stores'
import { getRestaurants } from '@/api/restaurant'
import { getBusinessStatus } from '@/utils/businessHours'

const router = useRouter()
const addressStore = useAddressStore()
const { address } = storeToRefs(addressStore)

const shopLists = ref([])
const loading = ref(false)
const activeRestaurantIds = ref(new Set())   // 有活动的餐馆 id 集合
const flashSaleIds = ref(new Set())           // 有秒杀活动的餐馆 id 集合

async function fetchActiveActivities() {
  try {
    const resp = await fetch('http://localhost:3000/v1/activity/active', { credentials: 'include' })
    const json = await resp.json()
    const acts = json.data || []
    const activeIds = new Set()
    const flashIds = new Set()
    acts.forEach(a => {
      if (a.restaurant_id) {
        activeIds.add(a.restaurant_id)
        if (a.type === 'flash_sale') flashIds.add(a.restaurant_id)
      }
    })
    activeRestaurantIds.value = activeIds
    flashSaleIds.value = flashIds
  } catch (e) { /* 静默 */ }
}
const noMore = ref(false)
const page = ref(1)
const limit = 4
const preventRepeat = ref(false)
const tipText = ref('')
const showTip = ref(false)

function goToStore(item) {
  if (!item.deliverable) {
    tipText.value = `该店铺距您约 ${item.distance}，已超出 30km 配送范围，暂时无法配送`
    showTip.value = true
    return
  }
  const bizStatus = getBusinessStatus(item.shopping_time_start, item.shopping_time_end)
  if (bizStatus === 'closed') {
    tipText.value = `${item.name} 当前已打烊，营业时间 ${item.shopping_time_start || '--'} ~ ${item.shopping_time_end || '--'}`
    showTip.value = true
    return
  }
  router.push({ path: 'store', query: { id: item.id } })
}

function fetchRestaurants(pageNum, callback) {
  if (preventRepeat.value) {
    loading.value = false
    return
  }
  const { lat, lng } = address.value
  // 坐标未就绪时不发请求
  if (!lat || !lng) {
    loading.value = false
    return
  }
  preventRepeat.value = true
  const offset = (pageNum - 1) * limit
  getRestaurants({ offset, limit, lng, lat }).then((response) => {
    const data = response.data.data
    preventRepeat.value = false
    noMore.value = data.length < limit
    callback(data)
  }).catch(() => {
    preventRepeat.value = false
    loading.value = false
  })
}

function onLoad() {
  // 如果 noMore 已被 firstFetch 占用，直接退出
  if (noMore.value) {
    loading.value = false
    return
  }
  fetchRestaurants(page.value, (data) => {
    data.forEach((el) => shopLists.value.push(el))
    page.value++
    loading.value = false
  })
}

function firstFetch() {
  // 先设 noMore=true 阻止 van-list 同时触发 onLoad
  noMore.value = true
  preventRepeat.value = false
  page.value = 1
  shopLists.value = []
  loading.value = false
  const { lat, lng } = address.value
  if (!lat || !lng) return
  preventRepeat.value = true
  getRestaurants({ offset: 0, limit, lng, lat }).then((response) => {
    const data = response.data.data
    preventRepeat.value = false
    shopLists.value = data
    page.value = 2
    // 数据加载完成后重置 noMore，让 van-list 正常工作
    noMore.value = data.length < limit
  }).catch(() => {
    preventRepeat.value = false
    noMore.value = false
  })
}

onMounted(() => {
  const { lat, lng } = address.value
  if (lat && lng) {
    firstFetch()
  } else {
    addressStore.fetchLocation()
  }
  fetchActiveActivities()
})

watch(address, (value) => {
  const { lat, lng } = value
  if (lat && lng) {
    firstFetch()
  }
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

.nearby-shops {
  margin: 0.1rem 0;

  nav {
    border-bottom: 1px solid $bottomLine;
    position: relative;
    @include px2rem(line-height, 80);
    ul {
      display: flex;
      li {
        font-size: 0.4rem;
        text-align: center;
        padding: 0 0.1rem;
        flex: 1;
        .icon-sort {
          display: inline-block;
          @include px2rem(width, 20);
          font-size: 0.3rem;
        }
      }
    }
  }

  .shop-item {
    display: flex;
    padding: 0.3rem 0;
    margin: 0 0.2rem;
    border-bottom: 1px solid $mtGrey;
    cursor: pointer;
    transition: opacity 0.2s;
    &:active { opacity: 0.85; }
    &--unreachable {
      opacity: 0.75;
      cursor: not-allowed;
      &:active { opacity: 0.75; }
    }
  }

  .img-show {
    position: relative;
    @include px2rem(width, 170);
    @include px2rem(height, 130);
    margin-right: 0.2rem;
    border: 1px solid $mtGrey;
    flex-shrink: 0;
    overflow: hidden;
    .unreachable-mask {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.06rem;
      .unreachable-icon { font-size: 0.5rem; line-height: 1; }
      .unreachable-text { font-size: 0.24rem; color: #fff; font-weight: bold; white-space: nowrap; }
    }
    // 已打烊蒙层
    .closed-mask {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      .closed-text {
        font-size: 0.36rem;
        font-weight: bold;
        color: #fff;
        letter-spacing: 0.04rem;
        background: rgba(0,0,0,0.3);
        padding: 0.06rem 0.2rem;
        border-radius: 0.08rem;
      }
    }
    .activity-badge {
      position: absolute;
      top: 0.12rem;
      left: 0.12rem;
      font-size: 0.22rem;
      padding: 0.04rem 0.14rem;
      background: linear-gradient(135deg, #f60, #ffd161);
      color: #fff;
      border-radius: 0.2rem;
      font-weight: bold;
      pointer-events: none;
    }
  }

  .detail {
    flex: 1;
    min-width: 0;
    h4 {
      font-size: 0.45rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 0.15rem;
      .unreachable-tag {
        display: inline-block;
        font-size: 0.22rem;
        font-weight: normal;
        color: #fff;
        background: #bbb;
        border-radius: 0.08rem;
        padding: 0.02rem 0.12rem;
        white-space: nowrap;
      }
    }
    .shops-message {
      display: flex;
      margin-top: 0.3rem;
      align-items: center;
      span { display: inline-block; vertical-align: bottom; font-size: 0.3rem; }
      .sell-num { flex: 1; }
      .delivery-info { display: flex; align-items: center; }
      .deliver-time--far, .distance--far { color: #bbb; }
    }
    .price-message {
      margin: 0.2rem 0;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      span { font-size: 0.2rem; }
      .out-of-range-tip { font-size: 0.26rem; color: #bbb; }
    }
    .active-message {
      ul li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        .discount-left {
          display: flex;
          margin: 0.1rem 0;
          align-items: center;
          .info {
            color: #777272;
            font-size: 0.3rem;
            display: inline-block;
            @include px2rem(width, 360);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .icon {
            margin-right: 0.15rem;
            display: inline-block;
            @include px2rem(width, 34);
            @include px2rem(height, 34);
          }
        }
      }
    }
  }
}
</style>
