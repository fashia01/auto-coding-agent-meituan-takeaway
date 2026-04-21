<template>
  <van-rate
    v-model="scoreNum"
    :count="5"
    :size="size"
    color="#ffd161"
    void-icon="star"
    void-color="#ddd"
    readonly
    allow-half
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: [Number, String], default: 0 },
  size: { type: String, default: '14px' },
})

const scoreNum = computed(() => {
  const s = Number(props.score)
  return isNaN(s) ? 0 : Math.min(5, Math.max(0, s))
})
</script>
