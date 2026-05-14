<template>
  <div id="menu">
    <!-- 拼单模式提示条 -->
    <div v-if="route.query.room" class="group-mode-banner" @click="backToGroupOrder">
      👥 拼单模式 · 你的加购会自动同步到房间 · 点击返回拼单页 →
    </div>
    <div class="left">
      <ul>
        <li
          v-for="(category, index) in foodsData"
          :key="category.id"
          :class="{ 'activity-menu': index === menuIndex }"
          @click="scrollToCategory(index)">
          {{ category.name }}
        </li>
      </ul>
    </div>
    <div class="right" ref="rightRef" @scroll="onRightScroll">
      <article ref="categorysRef">
        <section v-for="(category, catIndex) in foodsData" :key="category.id" :ref="el => { if (el) sectionRefs[catIndex] = el }">
          <h2>{{ category.name }}</h2>
          <article>
            <section v-for="spus in category.spus" :key="spus.id">
              <div class="img">
                <van-image :src="spus.pic_url" fit="cover" lazy-load width="100%" height="100%" />
              </div>
              <div class="info">
                <div class="name">{{ spus.name }}</div>
                <div class="sell-num">月售 {{ spus.month_saled_content }}</div>
                <span class="price">￥{{ spus.skus[0].price }}</span>
              </div>
              <food-selector
                :model-value="foodCount[spus.skus[0].id] || 0"
                @plus="openSpecModal(spus)"
                @minus="reduceFoodFromCart(spus)"
              />
            </section>
          </article>
        </section>
      </article>
    </div>
    <Bottom v-if="getInfoReady"></Bottom>

    <!-- 规格选择弹窗 -->
    <FoodSpecModal
      v-model:show="specModalShow"
      :food="specModalFood"
      @confirm="onSpecConfirm"
      @close="specModalShow = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import { storeToRefs } from 'pinia'
import { useCartStore, useRestaurantStore, useGroupOrderStore } from '@/stores'
import { getFoods } from '@/api/restaurant'
import { isCartFoodKey } from '@/utils/cart'
import Bottom from './bottom.vue'
import FoodSpecModal from '@/components/FoodSpecModal.vue'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()
const restaurantStore = useRestaurantStore()
const groupOrderStore = useGroupOrderStore()
const { cartList } = storeToRefs(cartStore)

const foodsData = ref([])
const getInfoReady = ref(false)
const menuIndex = ref(0)
const rightRef = ref(null)
const categorysRef = ref(null)
const sectionRefs = reactive([])
const categoryPositions = ref([])

// foodCount 直接从 cart store 实时计算，是唯一数据源
// 菜单页步进器、底部浮层步进器全部从这里读，无需手动同步
const foodCount = computed(() => {
  const restaurant_id = route.query.id
  const map = {}
  const cart = cartList.value[restaurant_id]
  if (cart) {
    for (const key in cart) {
      if (isCartFoodKey(key)) map[key] = cart[key].num || 0
    }
  }
  return map
})

// 规格弹窗状态
const specModalShow = ref(false)
const specModalFood = ref({})

// 点击 + 号时打开规格弹窗
function openSpecModal(spus) {
  specModalFood.value = spus
  specModalShow.value = true
}

// 弹窗确认：将选择的规格+数量加入购物车，处理跨店保护
async function onSpecConfirm({ sku, num }) {
  const restaurant_id = route.query.id
  const poi = restaurantStore.poi_info

  const addItem = () => {
    for (let i = 0; i < num; i++) {
      cartStore.addCart({
        restaurant_id,
        restaurant_name: poi.name,
        pic_url: poi.pic_url,
        food_id: sku.id,
        price: sku.price,
        name: specModalFood.value.name,
        foods_pic: specModalFood.value.pic_url,
        spec: sku.spec || sku.description || ''
      })
    }
    // foodCount 是 computed，会自动从 cart store 更新，无需手动赋值
    // 若当前处于拼单房间中，同步更新房间菜品（数量从 cart store 读）
    const cartItem = cartStore.cartList[restaurant_id] && cartStore.cartList[restaurant_id][sku.id]
    const currentQty = cartItem ? cartItem.num : 0
    syncGroupOrderItem(sku.id, currentQty, specModalFood.value.name, sku.price, {
      foods_pic: specModalFood.value.pic_url,
      spec: sku.spec || sku.description || ''
    })
  }

  try {
    addItem()
  } catch (err) {
    if (err.message === 'CROSS_STORE') {
      // 捕获跨店错误，弹出确认框
      try {
        await showDialog({
          title: '替换购物车',
          message: `您的购物车中已有"${err.oldRestaurantName}"的菜品，是否清空并加入"${err.newRestaurantName}"的菜品？`,
          confirmButtonText: '清空并加入',
          cancelButtonText: '取消',
          showCancelButton: true,
        })
        // 用户确认：清空旧购物车再添加
        cartStore.emptyCart({ restaurant_id: err.oldRestaurantId })
        addItem()
      } catch {
        // 用户取消，不做任何操作
      }
    }
  }
}

function reduceFoodFromCart(spus) {
  const restaurant_id = route.query.id
  const food_id = spus.skus[0].id
  cartStore.reduceCart({ restaurant_id, food_id })
  // foodCount 是 computed，会自动从 cart store 更新，无需手动赋值
  // 若在拼单房间，同步减少（数量从 cart store 读）
  const cartItem = cartStore.cartList[restaurant_id] && cartStore.cartList[restaurant_id][food_id]
  const newQty = cartItem ? cartItem.num : 0
  syncGroupOrderItem(food_id, newQty, spus.name, spus.skus[0].price, {
    foods_pic: spus.pic_url,
    spec: spus.skus[0].spec || spus.skus[0].description || ''
  })
}

// 若携带 room 参数，将加购操作同步到拼单房间
async function syncGroupOrderItem(food_id, qty, name, price, extra = {}) {
  const room_id = route.query.room
  if (!room_id) return
  try {
    const resp = await fetch(`${API_BASE}/v1/group_order/${room_id}/item`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_id,
        qty: Number(qty),
        name,
        price: Number(price),
        foods_pic: extra.foods_pic || '',
        spec: extra.spec || ''
      })
    })
    const json = await resp.json()
    if (json.status === 200) {
      if (qty > 0) showToast({ message: '✅ 已加入拼单', position: 'bottom', duration: 1000 })
      // 通知拼单页立即刷新（Pinia 跨组件通信，同 SPA 内实时生效）
      groupOrderStore.notifyUpdate(room_id)
    } else {
      console.log('[拼单同步] 失败:', json.message)
    }
  } catch (e) { /* 静默 */ }
}

function backToGroupOrder() {
  const room_id = route.query.room
  const restaurant_id = route.query.id
  if (room_id) {
    router.push({ path: '/group_order', query: { room: room_id, restaurant_id } })
  }
}

function scrollToCategory(index) {
  menuIndex.value = index
  if (sectionRefs[index]) {
    sectionRefs[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onRightScroll() {
  if (!rightRef.value) return
  const scrollTop = rightRef.value.scrollTop
  for (let i = 0; i < categoryPositions.value.length; i++) {
    const curr = categoryPositions.value[i]
    const next = categoryPositions.value[i + 1]
    if (scrollTop >= curr && (next === undefined || scrollTop < next)) {
      menuIndex.value = i
      break
    }
  }
}

onMounted(() => {
  const restaurant_id = route.query.id
  getFoods({ restaurant_id }).then((response) => {
    foodsData.value = response.data.data
    getInfoReady.value = true
    nextTick(() => {
      categoryPositions.value = sectionRefs.map(el => el ? el.offsetTop : 0)
    })
  })
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

#menu {
  display: flex;
  flex: 1;
  padding-bottom: 1.368rem;
  overflow: hidden;

  .left {
    @include px2rem(width, 140);
    background: rgb(244, 244, 244);
    overflow-y: auto;
    ul li {
      display: flex;
      @include px2rem(height, 100);
      padding: 0 0.2rem;
      align-items: center;
      font-size: 0.3rem;
      @include px2rem(line-height, 40);
      border-bottom: 1px dashed $mtGrey;
      &.activity-menu { background: #fff; }
    }
  }

  .right {
    position: relative;
    flex: 1;
    overflow-y: auto;
    article > section {
      padding-top: 0.2rem;
      h2 {
        font-size: 0.4rem;
        font-weight: bold;
        margin: 0 0.2rem;
        padding-left: 0.2rem;
        border-left: 3px solid $mtYellow;
      }
      article section {
        display: flex;
        position: relative;
        margin: 0 0.5rem;
        padding: 0.2rem 0;
        border-bottom: 1px solid $mtGrey;
        .img {
          @include px2rem(width, 122);
          @include px2rem(height, 126);
          margin-right: 0.2rem;
        }
        .info {
          flex: 1;
          vertical-align: top;
          .name, .price { font-weight: bold; }
          .name { font-size: 0.3rem; }
          .sell-num { font-size: 0.3rem; margin: 0.2rem 0; }
          .price { color: rgb(251, 79, 69); font-size: 0.4rem; }
        }
      }
    }
  }
}

.group-mode-banner {
  position: fixed;
  top: 1rem; left: 0; right: 0;
  z-index: 200;
  background: linear-gradient(90deg, #ffd161, #ffb700);
  color: #333;
  font-size: 0.24rem;
  font-weight: 500;
  text-align: center;
  padding: 0.14rem 0.3rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>
