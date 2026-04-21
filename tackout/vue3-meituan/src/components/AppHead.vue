<template>
  <van-nav-bar
    :title="title"
    :left-arrow="showBackArrow"
    :style="{ background: bgColor, color: color }"
    @click-left="handleBack"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps({
  title: { type: String, default: '' },
  // Accept both Boolean true and String "true" for compatibility
  goBack: { type: [Boolean, String], default: false },
  color: { type: String, default: '#333' },
  bgColor: { type: String, default: '#fff' },
})

// Normalize goBack: treat "true" string as boolean true
const showBackArrow = computed(() => props.goBack === true || props.goBack === 'true')

const router = useRouter()
const route = useRoute()

function handleBack() {
  if (route.fullPath.includes('/store')) {
    router.push({ path: '/index' })
  } else {
    router.back()
  }
}
</script>

<style scoped>
:deep(.van-nav-bar__title) {
  font-weight: bold;
}
:deep(.van-nav-bar__arrow) {
  font-size: 20px;
}
</style>
