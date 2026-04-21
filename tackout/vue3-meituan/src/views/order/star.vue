<template>
  <div class="star-container">
    <i
      class="iconfont star active"
      v-for="item in score"
      @click="makeScore(item)"
      :key="'active-' + item">&#xe70a;</i>
    <i
      class="iconfont star no-active"
      v-for="item in (5 - score)"
      @click="makeScore(item + score)"
      :key="'noactive-' + item">&#xe70a;</i>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['makeScore'])
const score = ref(1)

function makeScore(s) {
  score.value = s
  emit('makeScore', s)
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin";

.star-container {
  display: flex;
  justify-content: center;
  @include px2rem(height, 140);
  margin: 0 0.5rem;
  padding: 0.5rem 0;
  border-top: 1px solid $mtGrey;
  text-align: center;
  .star { margin: 0 0.1rem; }
  .active { color: $mtYellow; }
  .no-active { color: #999; }
}
</style>
