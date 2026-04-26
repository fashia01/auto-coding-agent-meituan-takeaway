<!-- 订单配送进度条 -->
<template>
  <div class="delivery-progress">
    <div class="progress-steps">
      <div
        v-for="(step, idx) in steps"
        :key="idx"
        class="step-item"
        :class="{
          'step-done': idx < currentIndex,
          'step-active': idx === currentIndex,
          'step-pending': idx > currentIndex
        }"
      >
        <!-- 图标 -->
        <div class="step-icon">
          <span v-if="idx < currentIndex" class="icon-done">✅</span>
          <span v-else-if="idx === currentIndex" class="icon-active pulse">{{ step.icon }}</span>
          <span v-else class="icon-pending">○</span>
        </div>
        <!-- 连接线（非最后一步） -->
        <div v-if="idx < steps.length - 1" class="step-line" :class="{ 'line-done': idx < currentIndex }"></div>
        <!-- 文字 -->
        <div class="step-label">{{ step.label }}</div>
      </div>
    </div>

    <!-- 倒计时 -->
    <div v-if="etaMinutes !== null && currentIndex < steps.length - 1" class="eta-countdown">
      <span class="eta-icon">⏱️</span>
      <span v-if="etaMinutes > 0">预计还需 <strong>{{ etaMinutes }}</strong> 分钟送达</span>
      <span v-else>即将送达</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
  eta: { type: Number, default: null }  // 预计送达时间戳(ms)
})

const steps = [
  { label: '等待接单', icon: '📋', statuses: ['支付成功'] },
  { label: '备餐中', icon: '🔥', statuses: ['accepted', 'preparing'] },
  { label: '骑手取餐', icon: '🛵', statuses: ['preparing'] },
  { label: '配送中', icon: '🚀', statuses: ['delivering'] },
  { label: '已送达', icon: '🎉', statuses: ['delivered'] }
]

// 状态映射到步骤索引
const STATUS_TO_INDEX = {
  '未支付': -1,
  '支付成功': 0,
  'accepted': 1,
  'preparing': 2,
  'delivering': 3,
  'delivered': 4,
  'cancelled': -1
}

const currentIndex = computed(() => STATUS_TO_INDEX[props.status] ?? 0)

// 倒计时（分钟）
const now = ref(Date.now())
let timer = null

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 30000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

const etaMinutes = computed(() => {
  if (!props.eta) return null
  const diff = props.eta - now.value
  return diff > 0 ? Math.ceil(diff / 60000) : 0
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.delivery-progress {
  padding: 0.3rem 0.2rem 0.1rem;
}

.progress-steps {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  padding: 0 0.1rem;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step-icon {
  font-size: 0.44rem;
  margin-bottom: 0.1rem;
  height: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-pending { font-size: 0.36rem; color: #ddd; }
.icon-done { font-size: 0.36rem; }

.pulse {
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.step-line {
  position: absolute;
  top: 0.26rem;
  left: 60%;
  right: -40%;
  height: 2px;
  background: #e0e0e0;
  z-index: 0;

  &.line-done {
    background: #ffd161;
  }
}

.step-label {
  font-size: 0.22rem;
  color: #999;
  text-align: center;
  white-space: nowrap;

  .step-done & { color: #f60; }
  .step-active & { color: #333; font-weight: bold; }
}

.eta-countdown {
  margin-top: 0.2rem;
  text-align: center;
  font-size: 0.28rem;
  color: #666;

  strong { color: #f60; font-size: 0.34rem; }
}
</style>
