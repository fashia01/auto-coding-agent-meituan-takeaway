<!-- 营销活动 Banner 组件 -->
<template>
  <div v-if="activities.length" class="activity-banner">
    <div
      v-for="act in activities"
      :key="act.id"
      class="activity-item"
      :class="act.type === 'flash_sale' ? 'activity-item--flash' : 'activity-item--discount'"
    >
      <!-- 左侧：活动类型标签 + 名称 -->
      <div class="activity-left">
        <span class="activity-tag">{{ act.type === 'flash_sale' ? '🔥秒杀' : '⚡限时' }}</span>
        <span class="activity-name">{{ act.name }}</span>
      </div>

      <!-- 中间：折扣力度 -->
      <div class="activity-discount">
        <template v-if="act.discount_type === 'fixed'">
          <span class="discount-label">满{{ act.threshold }}减</span>
          <span class="discount-value">¥{{ act.value }}</span>
        </template>
        <template v-else-if="act.discount_type === 'percent'">
          <span class="discount-value">{{ Math.round(act.value * 10) }}折</span>
        </template>
        <template v-else>
          <span class="discount-value">免配送费</span>
        </template>
      </div>

      <!-- 右侧：秒杀倒计时/库存 或 限时倒计时 -->
      <div class="activity-right">
        <template v-if="act.type === 'flash_sale'">
          <div class="stock-bar">
            <div class="stock-fill" :style="{ width: stockPercent(act) + '%' }"></div>
          </div>
          <span class="stock-text">剩余 {{ act.total_stock - act.sold_count }}/{{ act.total_stock }}</span>
          <van-button
            size="mini"
            round
            color="#f60"
            class="grab-btn"
            :loading="grabbing === act.id"
            :disabled="act.total_stock <= act.sold_count"
            @click="handleGrab(act)"
          >
            {{ act.total_stock <= act.sold_count ? '已抢完' : '立即抢' }}
          </van-button>
        </template>
        <template v-else>
          <span class="countdown">{{ countdowns[act.id] || '--:--:--' }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { showToast } from 'vant'

const API_BASE = 'http://localhost:3000'

const props = defineProps({
  restaurantId: { type: [Number, String], default: null }
})

const activities = ref([])
const countdowns = ref({})
const grabbing = ref(null)
let timer = null

function stockPercent(act) {
  if (!act.total_stock) return 0
  return Math.round(((act.total_stock - act.sold_count) / act.total_stock) * 100)
}

function formatCountdown(endAt) {
  const diff = Math.max(0, new Date(endAt).getTime() - Date.now())
  if (diff === 0) return '已结束'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const pad = n => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function updateCountdowns() {
  const now = Date.now()
  const updated = {}
  activities.value.forEach(act => {
    updated[act.id] = formatCountdown(act.end_at)
    // 过期则过滤掉
    if (new Date(act.end_at).getTime() < now) {
      activities.value = activities.value.filter(a => a.id !== act.id)
    }
  })
  countdowns.value = updated
}

async function fetchActivities() {
  try {
    const q = props.restaurantId ? `?restaurant_id=${props.restaurantId}` : ''
    const resp = await fetch(`${API_BASE}/v1/activity/active${q}`, { credentials: 'include' })
    const json = await resp.json()
    activities.value = json.data || []
    updateCountdowns()
  } catch (e) { /* 静默 */ }
}

async function handleGrab(act) {
  grabbing.value = act.id
  try {
    const resp = await fetch(`${API_BASE}/v1/activity/${act.id}/join`, {
      method: 'POST', credentials: 'include'
    })
    const json = await resp.json()
    if (json.status === 200) {
      showToast({ message: '🎉 抢购成功！优惠已自动应用', position: 'bottom' })
      act.sold_count = (act.sold_count || 0) + 1
    } else if (json.code === 'SOLD_OUT') {
      showToast({ message: '😢 手慢了，已被抢完', position: 'bottom' })
      act.sold_count = act.total_stock
    } else {
      showToast({ message: json.message || '抢购失败', position: 'bottom' })
    }
  } catch (e) {
    showToast({ message: '网络错误', position: 'bottom' })
  }
  grabbing.value = null
}

onMounted(() => {
  fetchActivities()
  timer = setInterval(updateCountdowns, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

.activity-banner {
  background: #fff;
  margin: 0.1rem 0;
  border-top: 1px solid #f0f0f0;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 0.18rem 0.3rem;
  border-bottom: 1px solid #f9f9f9;
  gap: 0.14rem;

  &--flash { background: linear-gradient(90deg, #fff8f0, #fff); }
  &--discount { background: linear-gradient(90deg, #f0f8ff, #fff); }

  .activity-left {
    display: flex;
    align-items: center;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;

    .activity-tag {
      font-size: 0.22rem;
      padding: 0.02rem 0.1rem;
      border-radius: 0.12rem;
      background: #f60;
      color: #fff;
      flex-shrink: 0;
    }

    .activity-name {
      font-size: 0.26rem;
      color: #333;
      @include ellipsis;
    }
  }

  .activity-discount {
    flex-shrink: 0;
    text-align: right;
    .discount-label { font-size: 0.22rem; color: #999; }
    .discount-value { font-size: 0.32rem; color: #f60; font-weight: bold; margin-left: 0.04rem; }
  }

  .activity-right {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.1rem;

    .stock-bar {
      width: 0.6rem;
      height: 0.1rem;
      background: #eee;
      border-radius: 0.05rem;
      overflow: hidden;

      .stock-fill {
        height: 100%;
        background: linear-gradient(to right, #f60, #ffd161);
        border-radius: 0.05rem;
      }
    }

    .stock-text { font-size: 0.22rem; color: #999; }

    .grab-btn { height: 0.5rem !important; font-size: 0.24rem !important; }

    .countdown {
      font-size: 0.26rem;
      color: #f60;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
      min-width: 1.2rem;
      text-align: right;
    }
  }
}
</style>
