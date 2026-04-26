<!-- AI 评论摘要卡片 -->
<template>
  <div class="review-card">
    <!-- 标题 -->
    <div class="review-card__header">
      <span class="review-card__icon">⭐</span>
      <span class="review-card__title">口碑报告</span>
      <span v-if="review.restaurant_name" class="review-card__rest">「{{ review.restaurant_name }}」</span>
    </div>

    <!-- 空态 -->
    <div v-if="!review.total_count" class="review-card__empty">
      <span>暂无评论数据</span>
    </div>

    <template v-else>
      <!-- 三维度评分 -->
      <div v-if="review.avg_scores" class="review-card__scores">
        <div class="score-item">
          <span class="score-label">口味</span>
          <span class="score-value">{{ review.avg_scores.food }}</span>
        </div>
        <span class="score-divider">|</span>
        <div class="score-item">
          <span class="score-label">配送</span>
          <span class="score-value">{{ review.avg_scores.delivery }}</span>
        </div>
        <span class="score-divider">|</span>
        <div class="score-item">
          <span class="score-label">品质</span>
          <span class="score-value">{{ review.avg_scores.quality }}</span>
        </div>
      </div>

      <!-- 综合进度条 -->
      <div v-if="review.avg_scores" class="review-card__bar">
        <div class="bar-fill" :style="{ width: barWidth + '%' }"></div>
        <span class="bar-label">综合 {{ overallScore }}/5.0</span>
      </div>

      <!-- 代表性评论 -->
      <div v-if="review.samples && review.samples.length" class="review-card__samples">
        <div v-for="(s, idx) in review.samples" :key="idx" class="sample-item">
          <span class="sample-icon">💬</span>
          <span class="sample-text">「{{ s.text }}」</span>
          <span class="sample-score">{{ s.food_score }}★</span>
        </div>
      </div>

      <!-- AI 一句话摘要 -->
      <div v-if="review.summary_text" class="review-card__summary">
        <span class="summary-label">AI总结：</span>{{ review.summary_text }}
      </div>

      <!-- 底部说明 -->
      <div class="review-card__meta">基于 {{ review.total_count }} 条评论</div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  review: { type: Object, required: true }
})

const overallScore = computed(() => {
  const s = props.review.avg_scores
  if (!s) return '-'
  return ((s.food + s.delivery + s.quality) / 3).toFixed(1)
})

const barWidth = computed(() => {
  const score = parseFloat(overallScore.value)
  if (isNaN(score)) return 0
  return Math.min(Math.round((score / 5) * 100), 100)
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

.review-card {
  margin: 0.2rem 0.3rem 0.1rem;
  padding: 0.26rem 0.3rem 0.2rem;
  background: #fff;
  border: 1px solid #ffe58f;
  border-radius: 0.2rem;
  box-shadow: 0 0.04rem 0.1rem rgba(255, 209, 97, 0.15);

  &__header {
    display: flex;
    align-items: center;
    gap: 0.1rem;
    margin-bottom: 0.16rem;
  }

  &__icon { font-size: 0.36rem; }
  &__title { font-size: 0.3rem; font-weight: bold; color: #333; }
  &__rest { font-size: 0.26rem; color: #888; margin-left: 0.08rem; }

  &__empty {
    text-align: center;
    padding: 0.2rem 0;
    font-size: 0.28rem;
    color: #aaa;
  }

  &__scores {
    display: flex;
    align-items: center;
    gap: 0.16rem;
    margin-bottom: 0.12rem;

    .score-item {
      display: flex;
      align-items: baseline;
      gap: 0.06rem;
      .score-label { font-size: 0.24rem; color: #888; }
      .score-value { font-size: 0.32rem; font-weight: bold; color: #f60; }
    }
    .score-divider { color: #ddd; font-size: 0.24rem; }
  }

  &__bar {
    display: flex;
    align-items: center;
    gap: 0.14rem;
    margin-bottom: 0.14rem;

    .bar-fill {
      height: 0.12rem;
      border-radius: 0.06rem;
      background: linear-gradient(to right, #ffd161, #f60);
      flex-shrink: 0;
      min-width: 0.1rem;
    }
    .bar-label { font-size: 0.24rem; color: #999; white-space: nowrap; }
  }

  &__samples {
    border-top: 1px solid #f5f5f5;
    padding-top: 0.12rem;
    margin-bottom: 0.12rem;

    .sample-item {
      display: flex;
      align-items: flex-start;
      gap: 0.1rem;
      margin-bottom: 0.1rem;
      font-size: 0.26rem;

      .sample-icon { flex-shrink: 0; }
      .sample-text { flex: 1; color: #555; line-height: 1.4; }
      .sample-score { flex-shrink: 0; color: #f60; font-size: 0.24rem; }
    }
  }

  &__summary {
    background: #fffbee;
    border-radius: 0.1rem;
    padding: 0.1rem 0.14rem;
    font-size: 0.26rem;
    color: #555;
    margin-bottom: 0.1rem;
    line-height: 1.5;

    .summary-label { font-weight: bold; color: #b36a00; }
  }

  &__meta {
    font-size: 0.22rem;
    color: #bbb;
    text-align: right;
  }
}
</style>
