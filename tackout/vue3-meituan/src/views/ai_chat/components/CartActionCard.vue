<template>
  <div class="cart-action-card">
    <!-- 清空成功 -->
    <template v-if="action.action === 'clear'">
      <div class="action-header">
        <span class="action-icon">🗑️</span>
        <span class="action-title">购物车已清空</span>
      </div>
      <p class="action-tip">可以重新告诉我你想吃什么～</p>
    </template>

    <!-- 查看购物车 -->
    <template v-else-if="action.action === 'view'">
      <div class="action-header">
        <span class="action-icon">🛒</span>
        <span class="action-title">当前购物车</span>
      </div>
      <div v-if="cartItems.length" class="item-list">
        <div v-for="item in cartItems" :key="item.id" class="item-row">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-detail">×{{ item.num }} · ¥{{ item.price }}</span>
        </div>
        <div class="cart-total">合计 ¥{{ cartTotal }}</div>
      </div>
      <p v-else class="action-tip">购物车是空的</p>
    </template>

    <!-- 加购成功 -->
    <template v-else-if="action.action === 'add' && action.success">
      <div class="action-header">
        <span class="action-icon">✅</span>
        <span class="action-title">已加入购物车</span>
      </div>
      <div class="item-list">
        <div v-for="item in action.items" :key="item.food_id" class="item-row">
          <van-image
            :src="item.pic_url"
            width="36"
            height="36"
            fit="cover"
            radius="4"
            class="item-img"
          />
          <span class="item-name">{{ item.name }}</span>
          <span class="item-detail">×{{ item.quantity }} · ¥{{ Number(item.price) * item.quantity }}</span>
        </div>
      </div>
      <div class="cart-total">
        合计 ¥{{ itemTotal }}
      </div>
      <div class="action-btns">
        <van-button size="small" round plain class="btn-continue" @click="$emit('continue')">
          继续点餐
        </van-button>
        <van-button size="small" round color="#ffd161" class="btn-checkout" @click="$emit('checkout')">
          去结算
        </van-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCartStore } from '@/stores'
import { storeToRefs } from 'pinia'

const props = defineProps({
  action: { type: Object, required: true }
})

defineEmits(['checkout', 'continue'])

const cartStore = useCartStore()
const { cartList } = storeToRefs(cartStore)

// 当前购物车所有菜品（用于 view 模式）
const cartItems = computed(() => {
  const items = []
  Object.values(cartList.value).forEach(rest => {
    Object.keys(rest).forEach(key => {
      if (Number(key)) items.push(rest[key])
    })
  })
  return items
})

const cartTotal = computed(() =>
  Object.values(cartList.value)
    .reduce((sum, rest) => sum + Number(rest.totalPrice || 0), 0)
    .toFixed(2)
)

// add 模式下的小计
const itemTotal = computed(() => {
  if (!props.action.items) return '0.00'
  return props.action.items
    .reduce((sum, item) => sum + Number(item.price) * (item.quantity || 1), 0)
    .toFixed(2)
})
</script>

<style lang="scss" scoped>
.cart-action-card {
  margin: 0.2rem 0;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 0.2rem;
  padding: 0.24rem 0.3rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  max-width: 92%;

  .action-header {
    display: flex;
    align-items: center;
    gap: 0.12rem;
    margin-bottom: 0.16rem;

    .action-icon { font-size: 0.36rem; }
    .action-title { font-size: 0.3rem; font-weight: bold; color: #333; }
  }

  .action-tip {
    font-size: 0.28rem;
    color: #999;
    margin: 0;
  }

  .item-list {
    display: flex;
    flex-direction: column;
    gap: 0.14rem;
    margin-bottom: 0.16rem;
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 0.14rem;

    .item-img { flex-shrink: 0; }
    .item-name {
      flex: 1;
      font-size: 0.28rem;
      color: #444;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .item-detail { font-size: 0.26rem; color: #999; flex-shrink: 0; }
  }

  .cart-total {
    text-align: right;
    font-size: 0.3rem;
    font-weight: bold;
    color: #fb4e44;
    padding-top: 0.1rem;
    border-top: 1px solid #f5f5f5;
    margin-bottom: 0.2rem;
  }

  .action-btns {
    display: flex;
    gap: 0.2rem;
    justify-content: flex-end;

    .btn-continue {
      border-color: #ddd !important;
      color: #666 !important;
    }
    .btn-checkout { color: #333 !important; }
  }
}
</style>
