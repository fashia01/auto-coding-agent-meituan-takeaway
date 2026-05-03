<template>
  <div class="share-page">
    <div v-if="loading" class="share-loading">
      <van-loading size="0.6rem" color="#ffd161" />
    </div>
    <div v-else-if="order" class="share-card">
      <!-- 餐馆头图 -->
      <div class="share-header">
        <van-image :src="restaurant.pic_url" fit="cover" width="100%" height="3rem" />
        <div class="share-overlay">
          <span class="share-tag">🍱 朋友的点单</span>
          <span class="share-name">{{ restaurant.name }}</span>
        </div>
      </div>

      <!-- 菜品列表（最多3条）-->
      <div class="share-body">
        <div v-for="(food, i) in previewFoods" :key="i" class="share-food-item">
          <van-image :src="food.pic_url" width="1rem" height="1rem" radius="0.1rem" fit="cover" />
          <div class="food-info">
            <span class="food-name">{{ food.name }}</span>
            <span class="food-price">¥{{ food.price }}</span>
          </div>
          <span class="food-num">×{{ food.num }}</span>
        </div>
        <div v-if="order.foods && order.foods.length > 3" class="share-more">
          还有 {{ order.foods.length - 3 }} 道菜...
        </div>
      </div>

      <!-- 总价 -->
      <div class="share-total">
        <span>共 {{ order.foods ? order.foods.length : 0 }} 道菜</span>
        <span class="total-price">￥{{ order.total_price?.toFixed(2) || '0.00' }}</span>
      </div>

      <!-- 我也要点 -->
      <van-button
        block
        color="#ffd161"
        style="color:#333; font-size:0.32rem; font-weight:bold; margin-top:0.3rem;"
        @click="goOrder"
      >我也要点 🛒</van-button>

      <p class="share-tip">点击按钮，去同一家餐馆点餐</p>
    </div>
    <div v-else class="share-error">
      <span>该分享已失效或不存在</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE = 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const order = ref(null)
const restaurant = ref({})

const previewFoods = computed(() => {
  if (!order.value?.foods) return []
  return order.value.foods.slice(0, 3)
})

async function loadShareData() {
  const orderId = route.query.order_id
  if (!orderId) { loading.value = false; return }
  try {
    const r = await fetch(`${API_BASE}/v1/order/${orderId}`, { credentials: 'include' })
    const j = await r.json()
    if (j.status === 200 && j.data) {
      order.value = j.data
      restaurant.value = j.data.restaurant_info || {}
    }
  } catch (e) {}
  loading.value = false
}

function goOrder() {
  if (restaurant.value.id) {
    router.push({ path: '/store/menu', query: { id: restaurant.value.id } })
  }
}

onMounted(loadShareData)
</script>

<style lang="scss" scoped>
.share-page {
  min-height: 100vh;
  background: #f4f4f4;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0.3rem;
}

.share-loading, .share-error {
  display: flex; justify-content: center; align-items: center;
  height: 60vh; font-size: 0.3rem; color: #999;
}

.share-card {
  width: 100%;
  background: #fff;
  border-radius: 0.2rem;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);

  .share-header {
    position: relative;
    .share-overlay {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.6));
      padding: 0.3rem;
      display: flex;
      flex-direction: column;
      gap: 0.06rem;
      .share-tag { font-size: 0.22rem; color: #ffd161; }
      .share-name { font-size: 0.36rem; color: #fff; font-weight: bold; }
    }
  }

  .share-body {
    padding: 0.2rem 0.3rem;
    .share-food-item {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.16rem 0;
      border-bottom: 1px solid #f5f5f5;
      .food-info { flex: 1; display: flex; flex-direction: column; gap: 0.04rem;
        .food-name { font-size: 0.28rem; color: #333; }
        .food-price { font-size: 0.24rem; color: #f60; }
      }
      .food-num { font-size: 0.24rem; color: #999; }
    }
    .share-more { text-align: center; padding: 0.16rem 0; font-size: 0.24rem; color: #bbb; }
  }

  .share-total {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.2rem 0.3rem;
    font-size: 0.26rem; color: #666;
    .total-price { font-size: 0.36rem; color: #333; font-weight: bold; }
  }

  .share-tip {
    text-align: center;
    font-size: 0.22rem;
    color: #ccc;
    padding: 0.16rem 0.3rem 0.3rem;
  }
}
</style>
