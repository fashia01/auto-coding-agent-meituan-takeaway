<template>
  <van-toast v-if="showTip" :message="text" @close="emit('update:showTip', false)" />
</template>

<script setup>
import { watch } from 'vue'
import { showToast } from 'vant'

const props = defineProps({
  text: { type: String, default: '' },
  showTip: { type: Boolean, default: false },
})

const emit = defineEmits(['update:showTip'])

watch(() => props.showTip, (val) => {
  if (val && props.text) {
    showToast(props.text)
    setTimeout(() => emit('update:showTip', false), 2000)
  }
})
</script>
