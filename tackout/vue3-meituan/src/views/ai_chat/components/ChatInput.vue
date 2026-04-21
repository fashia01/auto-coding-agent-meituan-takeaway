<template>
  <div class="chat-input-wrap">
    <input
      class="chat-input"
      type="text"
      v-model="text"
      placeholder="告诉我你想吃什么..."
      :disabled="disabled"
      @keyup.enter="handleSend"
    />
    <button class="send-btn" :disabled="disabled" @click="handleSend">发送</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: { type: Boolean, default: false }
})
const emit = defineEmits(['send'])

const text = ref('')

function handleSend() {
  const trimmed = text.value.trim()
  if (!trimmed || props.disabled) return
  emit('send', trimmed)
  text.value = ''
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

.chat-input-wrap {
  display: flex; align-items: center; padding: 0.2rem 0.3rem;
  background: #fff; border-top: 1px solid $mtGrey;
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 10;
  .chat-input {
    flex: 1; border: 1px solid $mtGrey; border-radius: 0.4rem; padding: 0.15rem 0.3rem;
    font-size: 0.35rem; outline: none; background: #f9f9f9; color: #333;
    &:disabled { background: #eee; color: #aaa; }
  }
  .send-btn {
    margin-left: 0.2rem; background: $mtYellow; border: none; border-radius: 0.4rem;
    padding: 0.15rem 0.35rem; font-size: 0.35rem; font-weight: bold; color: #333;
    cursor: pointer; outline: none; white-space: nowrap;
    &:disabled { background: $mtGrey; color: #aaa; cursor: not-allowed; }
    &:active:not(:disabled) { opacity: 0.8; }
  }
}
</style>
