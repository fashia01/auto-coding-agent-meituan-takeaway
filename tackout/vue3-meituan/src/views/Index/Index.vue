<!-- 首页：AI 主动推送气泡 -->
<template>
  <div class="index">
    <div class="main-container">
      <v-head title="美团外卖+"></v-head>
      <div class="guide-container">
        <router-link to="/location?fromIndex=true" class="location">
          <i class="iconfont">&#xe604;</i>
          <span class="address">{{ address.address }}</span>
          <i class="iconfont">&#xe6d7;</i>
        </router-link>
        <router-link to="/search" class="search">
          <i class="iconfont">&#xe626;</i>
          <span>请输入商家 商品名</span>
        </router-link>
      </div>
      <!-- 导航轮播部分 -->
      <v-nav></v-nav>

      <!-- AI 主动推送气泡 -->
      <transition name="push-slide">
        <div v-if="showPushBubble" class="push-bubble">
          <div class="push-bubble__body" @click="handleBubbleClick">
            <span class="push-bubble__icon">🤖</span>
            <span class="push-bubble__msg">{{ pushMessage }}</span>
          </div>
          <button class="push-bubble__close" @click.stop="dismissBubble">✕</button>
        </div>
      </transition>

      <!-- AI 个性化推荐（有数据时才展示） -->
      <HomeAiRecommend />
      <!-- 附近商家 -->
      <div class="head">
        <span class="line"></span>
        <h2>附近商家</h2>
        <span class="line"></span>
      </div>
      <nearby-shops v-if="locationReady"></nearby-shops>
    </div>
    <!-- 小购物车 -->
    <little-cart></little-cart>
    <!-- 主页底部 -->
    <v-bottom></v-bottom>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAddressStore } from '@/stores'
import { useRouter } from 'vue-router'
import { getInfo } from '@/utils/auth'
import littleCart from '../../components/littleCart.vue'
import nearbyShops from './nearby_shops.vue'
import vNav from './nav.vue'
import HomeAiRecommend from './HomeAiRecommend.vue'

const API_BASE = 'http://localhost:3000'

const addressStore = useAddressStore()
const { address, locationReady } = storeToRefs(addressStore)
const router = useRouter()

const showPushBubble = ref(false)
const pushMessage = ref('')
const pushContext = ref('')

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function dismissBubble() {
  showPushBubble.value = false
  localStorage.setItem('push_dismissed_date', todayStr())
}

function handleBubbleClick() {
  if (!pushMessage.value) return
  const msg = encodeURIComponent(pushMessage.value)
  const ctx = encodeURIComponent(pushContext.value)
  router.push(`/ai_chat?push_msg=${msg}&push_context=${ctx}`)
}

async function checkPushPending() {
  try {
    // 若今天已关闭气泡，不再检查
    const dismissed = localStorage.getItem('push_dismissed_date')
    if (dismissed === todayStr()) return

    const resp = await fetch(`${API_BASE}/v1/push/pending`, { credentials: 'include' })
    if (!resp.ok) return
    const data = await resp.json()
    if (data.has_push && data.message) {
      pushMessage.value = data.message
      pushContext.value = data.push_context || ''
      showPushBubble.value = true
    }
  } catch (e) {
    // 静默失败，不影响首页加载
  }
}

onMounted(() => {
  const { lat, lng } = address.value
  if (!lat || !lng) {
    addressStore.fetchLocation()
  }
  // 仅登录用户检查推送
  const username = getInfo()
  if (username) {
    checkPushPending()
  }
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";
.index {
  height: 100%;
  overflow: auto;
}
.main-container {
  padding-bottom: 1rem;
  .guide-container {
    display: flex;
    .location, .search {
      display: flex;
      align-items: center;
      border-radius: 0.4rem;
      @include px2rem(height, 57);
    }
    .location {
      @include px2rem(width, 250);
      display: flex;
      margin: 0 0.2rem;
      background: rgb(166, 166, 166);
      .iconfont {
        color: #fff;
        font-size: 0.35rem;
      }
      i:first-child {
        padding-left: 8px;
      }
      .address {
        flex: 1;
        font-size: 0.3rem;
        color: #fff;
        @include px2rem(width, 180);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      i:last-child {
        padding-right: 8px;
      }
    }
    .search {
      flex: 1;
      background: rgb(237, 237, 237);
      margin-right: 0.2rem;
      display: flex;
      align-items: center;
      .iconfont {
        display: inline-block;
        padding-left: 10px;
        padding-top: 2px;
        font-size: 0.4rem;
      }
      span {
        font-size: 0.35rem;
        display: inline-block;
        padding-left: 10px;
      }
    }
  }
  .head {
    text-align: center;
    padding-bottom: 0.1rem;
    border-bottom: 1px solid $bottomLine;
    .line {
      vertical-align: middle;
      display: inline-block;
      @include px2rem(width, 70);
      height: 0;
      border-bottom: 1px solid #000;
    }
    h2 {
      font-size: 0.5rem;
      display: inline-block;
      margin: 0.2rem;
    }
  }
}

/* AI 推送气泡 */
.push-bubble {
  display: flex;
  align-items: center;
  margin: 0.2rem 0.3rem 0;
  padding: 0.22rem 0.28rem;
  background: linear-gradient(135deg, #fff8e1, #fffde7);
  border: 1px solid #ffd161;
  border-radius: 0.2rem;
  box-shadow: 0 0.04rem 0.16rem rgba(255, 209, 97, 0.3);
  gap: 0.16rem;

  &__body {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.14rem;
    cursor: pointer;
  }

  &__icon {
    font-size: 0.44rem;
    flex-shrink: 0;
  }

  &__msg {
    font-size: 0.28rem;
    color: #333;
    line-height: 1.4;
  }

  &__close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #999;
    font-size: 0.28rem;
    padding: 0.08rem;
    cursor: pointer;
    line-height: 1;
  }
}

/* 气泡滑入动画 */
.push-slide-enter-active { transition: all 0.3s ease; }
.push-slide-leave-active { transition: all 0.2s ease; }
.push-slide-enter-from { transform: translateY(-0.3rem); opacity: 0; }
.push-slide-leave-to { transform: translateY(-0.2rem); opacity: 0; }
</style>
