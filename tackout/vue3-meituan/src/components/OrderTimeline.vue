<template>
  <div class="order-timeline">
    <van-steps
      direction="vertical"
      :active="activeStep"
      active-color="#ffd161"
    >
      <van-step v-for="step in steps" :key="step.status">
        <template #title>
          <span class="step-title" :class="{ 'step-title--active': step.isActive }">
            {{ step.label }}
          </span>
        </template>
        <template #message>
          <span class="step-time" v-if="step.time">{{ step.time }}</span>
          <span class="step-time step-time--pending" v-else-if="step.isPending">预计中...</span>
        </template>
      </van-step>
    </van-steps>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 当前订单状态字符串
  currentStatus: { type: String, default: '' },
  // 状态历史数组：[{ status: string, time: Date|string }]
  statusHistory: { type: Array, default: () => [] }
})

// 状态流水线定义（含中文标签）
const STATUS_PIPELINE = [
  { key: '支付成功',  label: '已支付' },
  { key: 'accepted',  label: '商家已接单' },
  { key: 'preparing', label: '备餐中' },
  { key: 'delivering',label: '配送中' },
  { key: 'delivered', label: '已送达' },
]

// 特殊终态
const TERMINAL_CANCELLED = 'cancelled'

// 历史状态 Map：status → 格式化时间字符串
const historyMap = computed(() => {
  const map = {}
  ;(props.statusHistory || []).forEach(h => {
    if (h.status && h.time) {
      map[h.status] = formatTime(h.time)
    }
  })
  // 兼容旧数据：支付成功 ≈ code===200 时写入
  return map
})

function formatTime(t) {
  const d = new Date(t)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 当前激活步骤索引
const activeStep = computed(() => {
  if (props.currentStatus === TERMINAL_CANCELLED) return -1
  const idx = STATUS_PIPELINE.findIndex(s => s.key === props.currentStatus)
  return idx >= 0 ? idx : 0
})

// 构建 steps 数组（包含是否已完成、时间）
const steps = computed(() => {
  if (props.currentStatus === TERMINAL_CANCELLED) {
    return [
      { status: TERMINAL_CANCELLED, label: '订单已取消', isActive: true, time: historyMap.value[TERMINAL_CANCELLED] || '', isPending: false }
    ]
  }
  return STATUS_PIPELINE.map((s, i) => {
    const isDone = i <= activeStep.value
    return {
      status: s.key,
      label: s.label,
      isActive: i === activeStep.value,
      time: historyMap.value[s.key] || '',
      isPending: !isDone
    }
  })
})
</script>

<style lang="scss" scoped>
.order-timeline {
  padding: 0.2rem 0.3rem;

  :deep(.van-steps) {
    background: transparent;
  }

  .step-title {
    font-size: 0.3rem;
    color: #666;

    &--active {
      font-size: 0.32rem;
      font-weight: bold;
      color: #333;
    }
  }

  .step-time {
    font-size: 0.26rem;
    color: #999;
    margin-top: 0.05rem;
    display: block;

    &--pending {
      color: #ccc;
    }
  }
}
</style>
