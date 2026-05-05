<template>
  <div class="chat-bubble-wrap" :class="role">
    <div class="bubble" :class="role">
      <span class="content">{{ content }}</span>
      <ReasoningTrace v-if="role === 'assistant' && reasoningSteps && reasoningSteps.length" :steps="reasoningSteps" />
    </div>
  </div>
</template>

<script setup>
import ReasoningTrace from './ReasoningTrace.vue'

defineProps({
  role: { type: String, default: 'assistant' },
  content: { type: String, default: '' },
  reasoningSteps: { type: Array, default: () => [] }
})
</script>

<style rel="stylesheet/scss" lang="scss">
@import "../../../style/mixin.scss";

.chat-bubble-wrap {
  display: flex;
  margin: 0.2rem 0.3rem;
  &.user { justify-content: flex-end; }
  &.assistant { justify-content: flex-start; }
}

.bubble {
  max-width: 72%;
  padding: 0.2rem 0.3rem;
  border-radius: 0.2rem;
  font-size: 0.35rem;
  line-height: 1.6;
  word-break: break-all;
  &.user { background: $mtYellow; color: #333; border-bottom-right-radius: 0.05rem; }
  &.assistant { background: #fff; color: #333; border-bottom-left-radius: 0.05rem; box-shadow: 0 0.02rem 0.1rem rgba(0,0,0,0.08); }
  .content { white-space: pre-wrap; }
}
</style>
