<template>
  <div class="reasoning-trace" v-if="steps && steps.length">
    <div class="rt-toggle" @click="expanded = !expanded">
      <span class="rt-icon">🧠</span>
      <span class="rt-label">查看推理过程（{{ steps.length }}步）</span>
      <span class="rt-arrow">{{ expanded ? '▲' : '▼' }}</span>
    </div>
    <transition name="rt-expand">
      <div class="rt-steps" v-if="expanded">
        <div v-for="(s, i) in steps" :key="i" class="rt-step">
          <div class="rt-step-dot"></div>
          <div class="rt-step-body">
            <span class="rt-step-name">{{ i + 1 }}. {{ s.step }}</span>
            <span v-if="s.detail" class="rt-step-detail">{{ s.detail }}</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  steps: { type: Array, default: () => [] }
})

const expanded = ref(false)
</script>

<style scoped>
.reasoning-trace {
  margin-top: 0.16rem;
  border-top: 1px solid #f0f0f0;
  padding-top: 0.12rem;
}

.rt-toggle {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  cursor: pointer;
  padding: 0.06rem 0;
  user-select: none;
  .rt-icon { font-size: 0.28rem; }
  .rt-label { font-size: 0.24rem; color: #999; flex: 1; }
  .rt-arrow { font-size: 0.2rem; color: #ccc; }
}

.rt-steps {
  padding: 0.12rem 0 0 0.24rem;
  overflow: hidden;
}

.rt-step {
  display: flex;
  gap: 0.16rem;
  margin-bottom: 0.16rem;
  position: relative;
  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 0.1rem;
    top: 0.36rem;
    width: 1px;
    height: calc(100% - 0.1rem);
    background: #e0e0e0;
  }

  .rt-step-dot {
    width: 0.2rem;
    height: 0.2rem;
    border-radius: 50%;
    background: #ffd161;
    border: 2px solid #f0a500;
    flex-shrink: 0;
    margin-top: 0.04rem;
  }

  .rt-step-body {
    display: flex;
    flex-direction: column;
    gap: 0.04rem;
    .rt-step-name { font-size: 0.26rem; font-weight: 500; color: #333; }
    .rt-step-detail { font-size: 0.22rem; color: #999; line-height: 1.4; }
  }
}

.rt-expand-enter-active, .rt-expand-leave-active {
  transition: all 0.25s ease;
  max-height: 10rem;
  overflow: hidden;
}
.rt-expand-enter-from, .rt-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
