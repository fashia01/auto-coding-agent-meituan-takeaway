<template>
  <van-stepper
    v-model="count"
    :min="0"
    :step="1"
    button-size="22px"
    input-width="28px"
    :disable-input="true"
    @plus="handlePlus"
    @minus="handleMinus"
  />
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  name: String,
  foodId: [String, Number],
  price: [String, Number],
  pic: String,
})

const emit = defineEmits(['update:modelValue', 'plus', 'minus', 'showDot'])

const count = ref(props.modelValue || 0)

// 外部 modelValue 变化时同步（弹窗确认后 foodCount 更新会触发此处）
watch(() => props.modelValue, (v) => {
  count.value = typeof v === 'number' ? v : 0
})

function handlePlus() {
  // 点加号：vant stepper 内部已自增，用 nextTick 确保回退在 vant 渲染后执行
  // 由父组件弹规格弹窗确认后，再更新 modelValue，watch 会同步 count
  nextTick(() => {
    count.value = props.modelValue || 0
  })
  emit('plus', props.modelValue || 0)
}

function handleMinus() {
  // 点减号：直接减少，不需要弹窗
  const newVal = Math.max(0, (props.modelValue || 0) - 1)
  count.value = newVal
  emit('update:modelValue', newVal)
  emit('minus', newVal)
}
</script>

<style scoped>
:deep(.van-stepper__minus) {
  border-color: #ffd161;
  color: #ffd161;
}
:deep(.van-stepper__plus) {
  background: #ffd161;
  border-color: #ffd161;
  color: #333;
}
</style>
