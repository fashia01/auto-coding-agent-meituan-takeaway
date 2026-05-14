<template>
  <div id="bottom">
    <!-- 购物车详细列表 -->
    <transition name="fade">
      <article class="cart-list-container" v-show="cartDetail">
        <section class="head">
          <span>餐盒费0元</span>
          <span><i class="iconfont">&#xe615;</i><span @click="emptyCartAction()">清空购物车</span></span>
        </section>
        <section class="cart-list" v-for="item in restaurantCartList" :key="item.id">
          <span>{{ item.name }} </span>
          <span class="price">￥{{ Number((item.price * item.num).toFixed(2)) }}</span>
          <food-selector
            :model-value="foodCount[item.id] || 0"
            @plus="addOne(item)"
            @minus="removeOne(item)"
            style="position:absolute;right:0;bottom:0.3rem;"
          />
        </section>
      </article>
    </transition>
    <!-- 底部 bar -->
    <div class="bottom-bar">
      <div class="left" @click="showCartDetail()">
        <span class="shopping-cart" :class="{ cartActive: totalPrice > 0, ballInCart: ballInCart }" ref="iconCartContainer">
          <i class="iconfont icon-cart">&#xe66b;</i>
          <span class="food-num" v-if="foodNum">{{ foodNum }}</span>
        </span>
        <div class="price-container">
          <span class="total-price" v-if="totalPrice">￥{{ totalPrice }}</span>
          <span class="deliver-fee" v-if="!shipping_fee">免配送费</span>
          <span class="deliver-fee" v-else>另需要配送费￥{{ shipping_fee }}</span>
        </div>
      </div>
      <span class="submit" v-if="!totalPrice">{{ min_price_tip }}</span>
      <span class="submit" v-else-if="totalPrice < min_price">还差{{ min_price - totalPrice }}</span>
      <span class="submit closed-tip" v-else-if="isClosed">商家已打烊</span>
      <span v-else @click="prepareOrder()" class="submit go-buy">去结算</span>
      <!-- 拼单按钮：独立显示，不依赖购物车数量 -->
      <span @click="startGroupOrder()" class="submit group-btn">
        {{ route.query.room ? '📋查看拼单' : '👥拼单' }}
      </span>
    </div>
    <transition name="fade">
      <div class="shade" v-show="cartDetail" @click="cartDetail = false"></div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCartStore, useRestaurantStore } from '@/stores'
import { getInfo } from '@/utils/auth'
import { getBusinessStatus } from '@/utils/businessHours'
import { isCartFoodKey } from '@/utils/cart'
import { showToast } from 'vant'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const restaurantStore = useRestaurantStore()
const { poi_info } = storeToRefs(restaurantStore)
const { cartList, ballInCart } = storeToRefs(cartStore)

// 营业状态
const businessStatus = computed(() =>
  getBusinessStatus(poi_info.value?.shopping_time_start, poi_info.value?.shopping_time_end)
)
const isClosed = computed(() => businessStatus.value === 'closed')

const cartDetail = ref(false)
const restaurant_id = ref(0)
const shipping_fee = ref(0)
const shipping_fee_tip = ref(0)
const min_price = ref(0)
const min_price_tip = ref('￥0起送')
const iconCartContainer = ref(null)

// foodCount 直接从 cart store 计算，与购物车实时同步
const foodCount = computed(() => {
  const map = {}
  const cart = cartList.value[restaurant_id.value]
  if (cart) {
    for (const key in cart) {
      if (isCartFoodKey(key)) map[key] = cart[key].num || 0
    }
  }
  return map
})

const totalPrice = computed(() => {
  return cartList.value[restaurant_id.value] ? cartList.value[restaurant_id.value].totalPrice : 0
})
const foodNum = computed(() => {
  return cartList.value[restaurant_id.value] ? cartList.value[restaurant_id.value].totalNum : 0
})
const restaurantCartList = computed(() => {
  const lists = cartList.value[restaurant_id.value]
  if (!lists) return []
  const arr = []
  for (const p in lists) {
    if (isCartFoodKey(p)) arr.push(lists[p])
  }
  return arr
})

function showCartDetail() {
  if (cartDetail.value) cartDetail.value = false
  else cartDetail.value = totalPrice.value > 0
}

function prepareOrder() {
  const data = {
    restaurant_id: restaurant_id.value,
    foods: cartList.value[restaurant_id.value]
  }
  if (getInfo()) {
    localStorage.setItem('confirmOrderData', JSON.stringify(data))
    router.push({ path: '/confirm_order' })
  } else {
    router.push({ path: '/login' })
  }
}

function emptyCartAction() {
  cartStore.emptyCart({ restaurant_id: restaurant_id.value })
  cartDetail.value = false
}

async function startGroupOrder() {
  if (!getInfo()) { router.push('/login'); return }
  // 如果已在拼单房间中，点击按钮跳到拼单页查看
  if (route.query.room) {
    router.push({ path: '/group_order', query: { room: route.query.room, restaurant_id: restaurant_id.value } })
    return
  }
  try {
    const resp = await fetch(`${API_BASE}/v1/group_order`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: Number(restaurant_id.value) })
    })
    const json = await resp.json()
    if (json.status === 200) {
      const { room_id } = json.data
      // 复制邀请链接（朋友打开此链接→拼单页→点「去选菜」→进入本菜单页并自动加入房间）
      const inviteLink = `${window.location.origin}${window.location.pathname}#/group_order?room=${room_id}&restaurant_id=${restaurant_id.value}`
      try { await navigator.clipboard.writeText(inviteLink) } catch (e) {}
      showToast({ message: '🎉 拼单房间已创建！邀请链接已复制，继续选菜吧', position: 'bottom', duration: 2500 })
      // 留在当前菜单页，URL 加上 room 参数进入拼单模式（不跳走）
      router.replace({ path: '/store/menu', query: { id: restaurant_id.value, room: room_id } })
    } else {
      showToast({ message: json.message || '创建失败', position: 'bottom' })
    }
  } catch (e) {
    showToast({ message: '网络错误', position: 'bottom' })
  }
}

function addOne(item) {
  cartStore.addCart({
    restaurant_id: restaurant_id.value,
    restaurant_name: poi_info.value ? poi_info.value.name : '',
    pic_url: poi_info.value ? poi_info.value.pic_url : '',
    food_id: item.id,
    price: item.price,
    name: item.name,
    foods_pic: item.foods_pic || ''
  })
}

function removeOne(item) {
  cartStore.reduceCart({ restaurant_id: restaurant_id.value, food_id: item.id })
}

watch(totalPrice, (val) => {
  if (val === 0) cartDetail.value = false
})

watch(poi_info, (val) => {
  shipping_fee.value = val.shipping_fee
  min_price.value = val.min_price
  min_price_tip.value = val.min_price_tip
  shipping_fee_tip.value = val.shipping_fee_tip
})

onMounted(() => {
  restaurant_id.value = route.query.id
  if (iconCartContainer.value) {
    iconCartContainer.value.addEventListener('webkitAnimationEnd', () => {
      cartStore.setBallInCart(false)
    })
  }
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

#bottom {
  width: 100%;
  z-index: 1000;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  .cart-list-container {
    position: fixed;
    left: 0; right: 0;
    @include px2rem(bottom, 90);
    z-index: 102;
    background: grey;
    section { padding: 0 0.1rem; }
    .head {
      display: flex;
      @include px2rem(height, 90);
      justify-content: space-between;
      align-items: center;
      background: #f4f4f4;
      span { font-size: 0.4rem; }
    }
    .cart-list {
      display: flex;
      align-items: center;
      position: relative;
      @include px2rem(height, 120);
      background: #fff;
      span { font-size: 0.4rem; }
      .price { margin: 0 0.5rem; }
      span:first-child { @include ellipsis; width: 50%; }
    }
  }
  .bottom-bar {
    display: flex;
    @include px2rem(height, 90);
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 103;
    background: rgb(51, 51, 51);
    .left { flex: 1; }
    .shopping-cart, .submit { color: rgb(165, 165, 165); @include px2rem(line-height, 90); }
    .shopping-cart {
      position: absolute;
      display: inline-block;
      @include px2rem(width, 110);
      @include px2rem(height, 110);
      @include px2rem(left, 26);
      @include px2rem(top, -30);
      border-radius: 50%;
      background: rgb(102, 102, 102);
      text-align: center;
      .icon-cart { font-size: 0.9rem; @include px2rem(line-height, 110); font-weight: bold; }
      &.cartActive { background: $mtYellow; .icon-cart { color: #000; } }
      &.ballInCart { animation: move .5s ease-in-out; }
      .food-num {
        position: absolute; top: 0; right: 0;
        color: #fff; font-size: 0.2rem;
        @include px2rem(width, 34); @include px2rem(line-height, 34);
        border-radius: 50%; background: #fb4e44; text-align: center;
      }
    }
    .price-container {
      @include px2rem(width, 400);
      height: 100%;
      padding-left: 2rem;
      display: inline-flex;
      flex-direction: column;
      justify-content: center;
      .total-price { display: inline-block; font-size: 0.6rem; color: #fff; }
      .deliver-fee { font-size: 0.35rem; color: #999999; }
    }
    .submit {
      @include px2rem(width, 200);
      height: 100%;
      font-weight: 500;
      font-size: 0.4rem;
      background: #2c2c2c;
      text-align: center;
      &.go-buy { color: #000; background: $mtYellow; }
      &.group-btn { color: #f60; background: #fff3e0; font-size: 0.32rem; border-left: 1px solid #ffe0b2; }
      &.closed-tip { color: #fff; background: #bbb; cursor: not-allowed; font-size: 0.28rem; }
    }
  }
  .shade {
    position: fixed;
    @include px2rem(top, 90);
    bottom: 0; left: 0; right: 0;
    z-index: 100;
    background: rgba(51, 51, 51, 0.4);
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity .3s }
.fade-enter-from, .fade-leave-active { opacity: 0 }

@keyframes move {
  0% { transform: scale(1) }
  25% { transform: scale(1.1) }
  50% { transform: scale(1.2) }
  75% { transform: scale(1.1) }
  100% { transform: scale(1) }
}
</style>
