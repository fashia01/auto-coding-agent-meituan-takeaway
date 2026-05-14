<template>
  <div class="group-order-page">
    <v-head title="拼单房间" goBack="true" />

    <!-- 加载错误 -->
    <div v-if="loadError" class="go-error">
      <span>🚫 {{ loadError }}</span>
      <van-button size="small" color="#ffd161" style="color:#333;margin-top:0.3rem;" @click="router.back()">返回</van-button>
    </div>

    <template v-else-if="room">
      <!-- 顶部状态栏 -->
      <div class="go-header">
        <div class="go-status-row">
          <span class="go-tag" :class="room.status === 'open' ? 'open' : 'closed'">
            {{ room.status === 'open' ? '🟢 拼单中' : '✅ 已结算' }}
          </span>
          <span class="go-room-id">房间号 {{ room.room_id }}</span>
        </div>
        <div class="go-actions" v-if="room.status === 'open'">
          <span class="go-action-btn" @click="copyShareLink">📤 邀请好友</span>
          <span class="go-action-btn primary" @click="goSelectFood">🍱 去选菜</span>
        </div>
      </div>

      <!-- 成员卡片 -->
      <div class="section-title">👥 成员选菜（{{ room.members.length }}人）</div>
      <div v-for="member in room.members" :key="member.user_id" class="member-card">
        <div class="member-header">
          <div class="member-info">
            <span class="member-avatar">{{ member.user_id === myUserId ? '🙋' : '👤' }}</span>
            <span class="member-name">{{ member.user_id === myUserId ? '我' : `伙伴 ${member.user_id}` }}</span>
            <span class="member-badge" v-if="member.user_id === room.creator_id">发起人</span>
          </div>
          <span class="member-subtotal" v-if="member.items.length">
            ¥{{ memberSubtotal(member).toFixed(2) }}
          </span>
        </div>

        <div v-for="item in member.items" :key="item.food_id" class="member-item">
          <van-image
            class="item-pic"
            :class="{ 'item-pic--placeholder': !item.foods_pic }"
            :src="item.foods_pic || ''"
            fit="cover"
            radius="6"
          />
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span v-if="item.spec" class="item-spec">规格：{{ item.spec }}</span>
            <span class="item-price">¥{{ item.price }}</span>
          </div>
          <div class="item-action">
            <van-stepper
              v-if="member.user_id === myUserId && room.status === 'open'"
              :model-value="item.qty"
              min="0"
              integer
              @change="(v) => handleQtyChange(item, v)"
              button-size="0.4rem"
            />
            <span v-else class="item-qty">×{{ item.qty }}</span>
          </div>
        </div>

        <div v-if="!member.items.length" class="member-empty">
          <span v-if="member.user_id === myUserId">
            你还没有选菜，<span class="link" @click="goSelectFood">点这里去选菜</span>
          </span>
          <span v-else>还未选菜...</span>
        </div>
      </div>

      <!-- 合计 + 操作按钮区 -->
      <div class="go-footer">
        <div class="go-total">
          <span class="total-label">预计合计（{{ totalItems }}道菜）</span>
          <span class="go-total-price">¥{{ totalPrice }}</span>
        </div>

        <template v-if="room.creator_id === myUserId && room.status === 'open'">
          <van-button
            block color="#ffd161"
            style="color:#333;font-size:0.36rem;font-weight:bold;"
            :loading="checkoutLoading"
            :disabled="totalItems === 0"
            @click="handleCheckout"
          >
            确认拼单结算 🚀
          </van-button>
          <p class="go-tip">合并所有成员的菜品，共同结算 · 每 5 秒自动刷新</p>
        </template>

        <div v-else-if="room.status === 'open'" class="go-waiting">
          <van-loading size="0.28rem" color="#ffd161" />
          <span>等待发起人确认结算... 每 5 秒自动刷新</span>
        </div>

        <van-button v-else block plain color="#ffd161" style="color:#333;" @click="router.push('/order')">
          查看订单
        </van-button>
      </div>
    </template>

    <!-- 初始加载 -->
    <div v-else class="go-loading">
      <van-loading color="#ffd161" size="0.6rem" />
      <p>正在加入拼单房间...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useGroupOrderStore, useCartStore } from '@/stores'
import { getFoods } from '@/api/restaurant'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()
const groupOrderStore = useGroupOrderStore()
const cartStore = useCartStore()

const room = ref(null)
const myUserId = ref(null)
const checkoutLoading = ref(false)
const loadError = ref('')
const foodMetaMap = ref({})
let pollTimer = null

const totalPrice = computed(() => {
  if (!room.value) return '0.00'
  let total = 0
  for (const member of room.value.members) {
    for (const item of member.items) {
      total += (item.price || 0) * (item.qty || 0)
    }
  }
  return total.toFixed(2)
})

const totalItems = computed(() => {
  if (!room.value) return 0
  return room.value.members.reduce((s, m) => s + m.items.length, 0)
})

function memberSubtotal(member) {
  return member.items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0)
}

async function fetchRoom() {
  const room_id = route.query.room
  if (!room_id) return
  try {
    const resp = await fetch(`${API_BASE}/v1/group_order/${room_id}`, { credentials: 'include' })
    const json = await resp.json()
    if (json.status === 200) {
      room.value = await hydrateRoomItems(json.data)
      loadError.value = ''
    } else {
      loadError.value = json.message === 'NOT_FOUND' ? '房间不存在或已过期' : (json.message || '获取房间失败')
      clearInterval(pollTimer)
    }
  } catch (e) { /* 静默 */ }
}

async function ensureFoodMetaMap(restaurant_id) {
  if (!restaurant_id || Object.keys(foodMetaMap.value).length) return
  try {
    const response = await getFoods({ restaurant_id })
    const categories = response?.data?.data || []
    const map = {}
    categories.forEach(category => {
      ;(category.spus || []).forEach(spu => {
        ;(spu.skus || []).forEach(sku => {
          map[sku.id] = {
            name: spu.name,
            foods_pic: spu.pic_url || '',
            spec: sku.spec || sku.description || ''
          }
        })
      })
    })
    foodMetaMap.value = map
  } catch (e) { /* 缺图不影响房间主流程 */ }
}

async function hydrateRoomItems(rawRoom) {
  if (!rawRoom) return rawRoom
  await ensureFoodMetaMap(rawRoom.restaurant_id)
  const map = foodMetaMap.value
  return {
    ...rawRoom,
    members: rawRoom.members.map(member => ({
      ...member,
      items: member.items.map(item => {
        const meta = map[item.food_id] || {}
        return {
          ...item,
          name: item.name || meta.name || '商品',
          foods_pic: item.foods_pic || meta.foods_pic || '',
          spec: item.spec || meta.spec || ''
        }
      })
    }))
  }
}

async function handleQtyChange(item, qty) {
  const room_id = route.query.room
  const restaurant_id = route.query.restaurant_id || (room.value && String(room.value.restaurant_id))
  const newQty = Number(qty)
  try {
    const resp = await fetch(`${API_BASE}/v1/group_order/${room_id}/item`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_id: item.food_id,
        qty: newQty,
        name: item.name,
        price: item.price,
        foods_pic: item.foods_pic || '',
        spec: item.spec || ''
      })
    })
    const json = await resp.json()
    if (json.status === 200 && json.data) {
      room.value = json.data
      // 同步 cart store：使购物车与拼单房间保持一致
      if (restaurant_id) {
        const oldQty = cartStore.cartList[restaurant_id]?.[item.food_id]?.num || 0
        if (newQty > oldQty) {
          // 增加：addCart 差量
          for (let i = 0; i < newQty - oldQty; i++) {
            try {
              cartStore.addCart({
                restaurant_id,
                restaurant_name: room.value.restaurant_name || '',
                pic_url: '',
                food_id: item.food_id,
                price: item.price,
                name: item.name,
                foods_pic: item.foods_pic || '',
                spec: item.spec || ''
              })
            } catch (e) { /* 跨店冲突静默 */ }
          }
        } else if (newQty < oldQty) {
          // 减少：reduceCart 差量
          for (let i = 0; i < oldQty - newQty; i++) {
            cartStore.reduceCart({ restaurant_id, food_id: item.food_id })
          }
        }
      }
    }
  } catch (e) { /* 静默 */ }
}

async function handleCheckout() {
  const room_id = route.query.room
  checkoutLoading.value = true
  try {
    const resp = await fetch(`${API_BASE}/v1/group_order/${room_id}/checkout`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const json = await resp.json()
    if (json.status === 200) {
      showToast({ message: '🎉 拼单成功！正在前往支付...', position: 'bottom', duration: 1500 })
      clearInterval(pollTimer)
      // 与普通结算保持一致：跳转到支付页面
      setTimeout(() => router.push({ path: '/pay', query: { order_id: json.data.order_id } }), 1500)
    } else {
      showToast({ message: json.message || '结算失败', position: 'bottom' })
    }
  } catch (e) {
    showToast({ message: '网络错误', position: 'bottom' })
  }
  checkoutLoading.value = false
}

async function copyShareLink() {
  const room_id = route.query.room
  const link = `${window.location.origin}${window.location.pathname}#/group_order?room=${room_id}&restaurant_id=${room.value?.restaurant_id || ''}`
  try { await navigator.clipboard.writeText(link) } catch (e) {}
  showToast({ message: '✅ 邀请链接已复制，发给好友一起选菜！', position: 'bottom', duration: 2500 })
}

function goSelectFood() {
  const room_id = route.query.room
  const restaurant_id = route.query.restaurant_id || (room.value && room.value.restaurant_id)
  if (restaurant_id) {
    router.push({ path: '/store/menu', query: { id: restaurant_id, room: room_id } })
  } else {
    showToast({ message: '无法获取餐馆信息', position: 'bottom' })
  }
}

async function initRoom() {
  const room_id = route.query.room
  if (!room_id) { loadError.value = '缺少房间号'; return }
  try {
    const infoResp = await fetch(`${API_BASE}/admin/user_info`, { credentials: 'include' })
    const infoJson = await infoResp.json()
    if (infoJson.data && infoJson.data.id) myUserId.value = Number(infoJson.data.id)
  } catch (e) { /* 静默 */ }
  try {
    await fetch(`${API_BASE}/v1/group_order/${room_id}/join`, { method: 'POST', credentials: 'include' })
  } catch (e) { /* 静默 */ }
  await fetchRoom()
}

onMounted(() => {
  initRoom()
  pollTimer = setInterval(fetchRoom, 5000)

  // 监听菜单页加菜的实时通知（Pinia store 变化 → 立即刷新，无需等轮询）
  watch(() => groupOrderStore.lastUpdateTs, (ts) => {
    if (ts > 0 && groupOrderStore.currentRoomId === route.query.room) {
      fetchRoom()
    }
  })
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  window.removeEventListener('storage', onStorageUpdate)
})

function onStorageUpdate(e) {
  if (e.key === 'group_room_update') {
    try {
      const { room_id } = JSON.parse(e.newValue)
      if (room_id === route.query.room) fetchRoom()
    } catch (_) { /* 静默 */ }
  }
}
</script>

<style lang="scss" scoped>
@import "../../style/mixin.scss";

.group-order-page {
  min-height: 100vh;
  background: #f4f4f4;
  padding-bottom: 3rem;
}

.go-error, .go-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; gap: 0.24rem;
  span, p { font-size: 0.3rem; color: #999; }
}

.go-header {
  background: #fff; padding: 0.24rem 0.3rem; margin-bottom: 0.16rem;
  .go-status-row {
    display: flex; align-items: center; gap: 0.2rem; margin-bottom: 0.16rem;
    .go-tag {
      font-size: 0.24rem; padding: 0.06rem 0.18rem; border-radius: 0.2rem;
      &.open { background: #e8f5e9; color: #2e7d32; }
      &.closed { background: #e3f2fd; color: #1565c0; }
    }
    .go-room-id { font-size: 0.22rem; color: #bbb; }
  }
  .go-actions {
    display: flex; gap: 0.16rem;
    .go-action-btn {
      flex: 1; text-align: center; font-size: 0.28rem; color: #666;
      padding: 0.14rem 0; border-radius: 0.08rem; background: #f5f5f5; cursor: pointer;
      &.primary { background: #ffd161; color: #333; font-weight: 500; }
    }
  }
}

.section-title { font-size: 0.28rem; font-weight: bold; color: #333; padding: 0.2rem 0.3rem 0.12rem; }

.member-card {
  background: #fff; margin-bottom: 0.12rem;
  .member-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.2rem 0.3rem; border-bottom: 1px solid #f5f5f5;
    .member-info { display: flex; align-items: center; gap: 0.12rem; }
    .member-avatar { font-size: 0.36rem; }
    .member-name { font-size: 0.3rem; font-weight: 500; color: #333; }
    .member-badge { font-size: 0.2rem; color: #f60; background: #fff3e0; padding: 0.02rem 0.1rem; border-radius: 0.1rem; }
    .member-subtotal { font-size: 0.28rem; color: #f60; font-weight: 500; }
  }
  .member-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.18rem 0.3rem; border-bottom: 1px solid #f9f9f9;
    .item-pic {
      width: 1.2rem; height: 1.2rem; flex-shrink: 0; margin-right: 0.2rem;
      &--placeholder { background: #f2f2f2; }
    }
    .item-info {
      flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.06rem;
      .item-name { font-size: 0.28rem; color: #333; font-weight: 500; line-height: 1.3; }
      .item-spec { font-size: 0.22rem; color: #999; }
      .item-price { font-size: 0.26rem; color: #f60; font-weight: 500; }
    }
    .item-action {
      display: flex; align-items: center; margin-left: 0.2rem; flex-shrink: 0;
      .item-qty { font-size: 0.24rem; color: #666; background: #f5f5f5; padding: 0.04rem 0.16rem; border-radius: 0.1rem; }
    }
  }
  .member-empty {
    padding: 0.24rem 0.3rem; font-size: 0.26rem; color: #bbb; text-align: center;
    .link { color: #e6a000; font-weight: 500; cursor: pointer; text-decoration: underline; }
  }
}

.go-footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; padding: 0.2rem 0.3rem 0.3rem;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
  .go-total {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.16rem;
    .total-label { font-size: 0.26rem; color: #666; }
    .go-total-price { font-size: 0.44rem; font-weight: bold; color: #333; }
  }
  .go-tip { text-align: center; font-size: 0.22rem; color: #bbb; margin-top: 0.12rem; }
  .go-waiting {
    display: flex; align-items: center; justify-content: center; gap: 0.16rem;
    padding: 0.2rem 0; font-size: 0.26rem; color: #999;
  }
}
</style>
