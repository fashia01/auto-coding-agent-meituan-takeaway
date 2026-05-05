<!-- AI 套餐规划卡片 -->
<template>
  <div class="combo-card">
    <!-- 头部：餐馆名 + 标题 -->
    <div class="combo-header">
      <span class="combo-icon">🍱</span>
      <span class="combo-title">AI 套餐方案</span>
      <span v-if="combo.restaurant_name" class="combo-rest">{{ combo.restaurant_name }}</span>
    </div>

    <!-- 菜品列表 -->
    <div class="combo-items">
      <div v-for="(item, idx) in combo.items" :key="idx" class="combo-item">
        <img v-if="item.pic_url" :src="item.pic_url" class="combo-item-pic" />
        <div v-else class="combo-item-pic-placeholder">🍽️</div>
        <div class="combo-item-info">
          <span class="combo-item-name">{{ item.name }}</span>
          <span class="combo-item-qty">× {{ item.qty }}</span>
        </div>
        <span class="combo-item-price">¥{{ item.price }}</span>
      </div>
    </div>

    <!-- 合计 -->
    <div class="combo-total">
      <span class="combo-total-label">合计</span>
      <span class="combo-total-price">¥{{ combo.total_price }}</span>
    </div>

    <!-- AI 规划说明 -->
    <div v-if="combo.reasoning" class="combo-reasoning">
      <span class="combo-reasoning-icon">💡</span>
      <span>{{ combo.reasoning }}</span>
    </div>

    <!-- 约束满足状态 -->
    <div v-if="combo.constraints_met && Object.keys(combo.constraints_met).length" class="combo-constraints">
      <span
        v-if="combo.constraints_met.budget !== undefined"
        :class="['constraint-tag', combo.constraints_met.budget ? 'ok' : 'warn']"
      >
        {{ combo.constraints_met.budget ? '✅ 未超预算' : '⚠️ 已超预算' }}
      </span>
      <span
        v-if="combo.constraints_met.no_spicy !== undefined"
        :class="['constraint-tag', combo.constraints_met.no_spicy ? 'ok' : 'warn']"
      >
        {{ combo.constraints_met.no_spicy ? '✅ 含非辣菜品' : '⚠️ 未满足不辣要求' }}
      </span>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!added" class="combo-actions">
      <van-button
        size="small"
        round
        color="#ffd161"
        :loading="adding"
        @click="addAllToCart"
      >
        全部加入购物车
      </van-button>
    </div>

    <!-- 已加购后显示 -->
    <div v-else class="combo-added">
      <span class="added-tip">✅ 已加入购物车</span>
      <van-button size="small" round plain color="#ffd161" @click="$emit('checkout')">
        去结算
      </van-button>
    </div>

    <!-- 跨店冲突确认 -->
    <div v-if="crossStoreConflict" class="combo-conflict">
      <p class="conflict-tip">⚠️ 购物车已有「{{ crossStoreConflict.oldName }}」的菜品，是否清空并加入新套餐？</p>
      <div class="conflict-actions">
        <van-button size="small" round color="#ffd161" @click="confirmCrossStore">清空并加入</van-button>
        <van-button size="small" round plain @click="crossStoreConflict = null">取消</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCartStore } from '@/stores'

const props = defineProps({
  combo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['added', 'checkout'])

const cartStore = useCartStore()
const adding = ref(false)
const added = ref(false)
const crossStoreConflict = ref(null)

function buildCartItems() {
  return (props.combo.items || []).map(item => ({
    food_id: item.food_id,
    name: item.name,
    price: String(item.price),
    quantity: item.qty || 1,
    restaurant_id: props.combo.restaurant_id,
    restaurant_name: props.combo.restaurant_name || '',
    restaurant_pic: '',
    pic_url: item.pic_url || ''
  }))
}

function doAddItems(items, force) {
  if (force) {
    // 清空旧购物车
    Object.keys(cartStore.cartList).forEach(rid => cartStore.emptyCart({ restaurant_id: rid }))
  }
  let crossErr = null
  items.forEach(item => {
    for (let i = 0; i < (item.quantity || 1); i++) {
      try {
        cartStore.addCart({
          restaurant_id: item.restaurant_id,
          restaurant_name: item.restaurant_name,
          pic_url: item.restaurant_pic,
          food_id: item.food_id,
          price: item.price,
          name: item.name,
          foods_pic: item.pic_url
        })
      } catch (e) {
        if (e.message === 'CROSS_STORE') crossErr = e
      }
    }
  })
  return crossErr
}

async function addAllToCart() {
  adding.value = true
  const items = buildCartItems()
  const crossErr = doAddItems(items, false)
  adding.value = false

  if (crossErr) {
    // 跨店冲突：显示确认提示
    const existingKeys = Object.keys(cartStore.cartList)
    const oldName = existingKeys.length && cartStore.cartList[existingKeys[0]] && cartStore.cartList[existingKeys[0]].restaurant_name
    crossStoreConflict.value = { items, oldName: oldName || '其他餐馆' }
  } else {
    added.value = true
    emit('added', items)
  }
}

function confirmCrossStore() {
  if (!crossStoreConflict.value) return
  const items = crossStoreConflict.value.items
  doAddItems(items, true)
  crossStoreConflict.value = null
  added.value = true
  emit('added', items)
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

.combo-card {
  margin: 0.2rem 0.3rem 0.1rem;
  padding: 0.28rem 0.3rem 0.2rem;
  background: #fff;
  border: 1px solid #ffd161;
  border-radius: 0.2rem;
  box-shadow: 0 0.04rem 0.12rem rgba(255, 209, 97, 0.2);
}

.combo-header {
  display: flex;
  align-items: center;
  gap: 0.12rem;
  margin-bottom: 0.18rem;

  .combo-icon { font-size: 0.36rem; }
  .combo-title { font-size: 0.32rem; font-weight: bold; color: #333; }
  .combo-rest { font-size: 0.26rem; color: #888; margin-left: auto; }
}

.combo-items {
  border-top: 1px solid #f0f0f0;
  padding-top: 0.12rem;
  margin-bottom: 0.12rem;
}

.combo-item {
  display: flex;
  align-items: center;
  padding: 0.1rem 0;
  gap: 0.16rem;

  .combo-item-pic {
    width: 0.72rem;
    height: 0.72rem;
    border-radius: 0.08rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  .combo-item-pic-placeholder {
    width: 0.72rem;
    height: 0.72rem;
    border-radius: 0.08rem;
    background: #f4f4f4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.36rem;
    flex-shrink: 0;
  }

  .combo-item-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.12rem;

    .combo-item-name { font-size: 0.28rem; color: #333; }
    .combo-item-qty { font-size: 0.26rem; color: #999; }
  }

  .combo-item-price { font-size: 0.28rem; color: #f60; font-weight: bold; }
}

.combo-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.12rem 0;
  border-top: 1px dashed #eee;
  margin-bottom: 0.12rem;

  .combo-total-label { font-size: 0.28rem; color: #666; }
  .combo-total-price { font-size: 0.36rem; color: #f60; font-weight: bold; }
}

.combo-reasoning {
  display: flex;
  align-items: flex-start;
  gap: 0.1rem;
  margin-bottom: 0.14rem;
  font-size: 0.26rem;
  color: #888;
  line-height: 1.5;

  .combo-reasoning-icon { flex-shrink: 0; }
}

.combo-constraints {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem;
  margin-bottom: 0.16rem;

  .constraint-tag {
    font-size: 0.24rem;
    padding: 0.04rem 0.14rem;
    border-radius: 0.2rem;

    &.ok { background: #f0fff4; color: #38a169; border: 1px solid #9ae6b4; }
    &.warn { background: #fffbf0; color: #d69e2e; border: 1px solid #fbd38d; }
  }
}

.combo-actions {
  display: flex;
  justify-content: flex-end;
}

.combo-added {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.1rem;

  .added-tip { font-size: 0.28rem; color: #38a169; }
}

.combo-conflict {
  margin-top: 0.18rem;
  padding: 0.16rem 0.2rem;
  background: #fff7e6;
  border: 1px solid #ffd161;
  border-radius: 0.12rem;

  .conflict-tip { font-size: 0.26rem; color: #555; margin: 0 0 0.12rem; }
  .conflict-actions { display: flex; gap: 0.16rem; }
}
</style>
