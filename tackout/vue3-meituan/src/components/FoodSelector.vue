<template>
  <van-stepper
    v-model="count"
    :min="0"
    :step="1"
    button-size="22px"
    input-width="28px"
    @change="handleChange"
    @plus="emit('plus', count)"
    @minus="emit('minus', count)"
  />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  name: String,
  foodId: [String, Number],
  price: [String, Number],
  pic: String,
})

const emit = defineEmits(['update:modelValue', 'plus', 'minus', 'showDot'])

const count = ref(props.modelValue)

watch(() => props.modelValue, (v) => { count.value = v })

function handleChange(val) {
  emit('update:modelValue', val)
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
