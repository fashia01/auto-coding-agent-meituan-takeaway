<template>
  <div class="ai-recommend" v-if="foods.length">
    <!-- 标题 -->
    <div class="ai-recommend__header">
      <span class="ai-recommend__icon">🤖</span>
      <span class="ai-recommend__title">为你推荐</span>
      <span class="ai-recommend__sub">{{ tasteHint }}</span>
    </div>

    <!-- 横向滑动卡片 -->
    <div class="ai-recommend__scroll">
      <div
        v-for="food in foods"
        :key="food._id || food.id"
        class="food-card"
        @click="goToRestaurant(food)"
      >
        <van-image
          class="food-card__img"
          :src="food.pic_url"
          fit="cover"
          radius="8"
        />
        <div class="food-card__body">
          <div class="food-card__name van-ellipsis">{{ food.name }}</div>
          <div class="food-card__price">
            <span class="price-unit">￥</span>
            <span class="price-val">{{ food.skus?.[0]?.price ?? food.min_price ?? '--' }}</span>
          </div>
          <div class="food-card__meta van-ellipsis" v-if="food.tag_list">{{ food.tag_list }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { _get } from '@/api/index'

const router = useRouter()
const foods = ref([])
const meta = ref({})

const tasteHint = computed(() => {
  const tags = meta.value?.userTags
  if (tags && tags.length) return `根据您偏好「${tags.slice(0, 2).join('、')}」`
  const hour = meta.value?.hour
  if (hour !== undefined) {
    if (hour >= 6 && hour < 10) return '早餐时段推荐'
    if (hour >= 10 && hour < 14) return '午餐时段推荐'
    if (hour >= 14 && hour < 17) return '下午茶推荐'
    if (hour >= 17 && hour < 21) return '晚餐时段推荐'
    return '夜宵时段推荐'
  }
  return '猜你喜欢'
})

function goToRestaurant(food) {
  if (food.restaurant_id) {
    router.push({ path: '/store', query: { id: food.restaurant_id } })
  }
}

onMounted(async () => {
  try {
    const res = await _get({ url: 'v1/home/recommend' })
    if (res.data?.status === 200 && res.data.data?.length) {
      foods.value = res.data.data
      meta.value = res.data.meta || {}
    }
  } catch (e) {
    // 获取失败静默处理，不展示模块
  }
})
</script>

<style lang="scss" scoped>
.ai-recommend {
  margin: 0.2rem 0;
  background: #fff;
  border-radius: 0.16rem;
  overflow: hidden;
  padding-bottom: 0.2rem;

  &__header {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.3rem 0.1rem;
    gap: 0.1rem;
  }

  &__icon {
    font-size: 0.4rem;
  }

  &__title {
    font-size: 0.36rem;
    font-weight: bold;
    color: #333;
  }

  &__sub {
    font-size: 0.26rem;
    color: #999;
    margin-left: 0.1rem;
  }

  &__scroll {
    display: flex;
    overflow-x: auto;
    padding: 0.1rem 0.2rem 0;
    gap: 0.2rem;
    // 隐藏滚动条
    &::-webkit-scrollbar { display: none; }
    scrollbar-width: none;
  }
}

.food-card {
  flex-shrink: 0;
  width: 2.2rem;
  border-radius: 0.12rem;
  overflow: hidden;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: transform 0.15s;

  &:active { transform: scale(0.97); }

  &__img {
    width: 2.2rem;
    height: 1.8rem;
  }

  &__body {
    padding: 0.12rem 0.14rem 0.16rem;
  }

  &__name {
    font-size: 0.28rem;
    font-weight: 500;
    color: #333;
    line-height: 1.3;
    margin-bottom: 0.06rem;
  }

  &__price {
    color: #f44;
    line-height: 1;
    margin-bottom: 0.04rem;

    .price-unit { font-size: 0.22rem; }
    .price-val  { font-size: 0.34rem; font-weight: bold; }
  }

  &__meta {
    font-size: 0.22rem;
    color: #bbb;
  }
}
</style>
