<template>
  <div class="group-order-page">
    <v-head title="拼单" goBack="true" />

    <div v-if="!room" class="go-loading">
      <van-loading color="#ffd161" size="0.6rem" />
      <p>加入拼单房间中...</p>
    </div>

    <template v-else>
      <!-- 房间状态 -->
      <div class="go-header">
        <div class="go-status">
          <span class="go-tag">{{ room.status === 'open' ? '🟢 拼单中' : '✅ 已结算' }}</span>
          <span class="go-room-id">房间号：{{ room.room_id }}</span>
        </div>
        <div class="go-share" v-if="room.status === 'open'" @click="copyShareLink">
          📤 分享房间链接
        </div>
      </div>

      <!-- 成员选菜状态 -->
      <div class="section-title">👥 成员选菜（{{ room.members.length }}人）</div>
      <div v-for="member in room.members" :key="member.user_id" class="member-card">
        <div class="member-header">
          <span class="member-name">{{ member.user_id === myUserId ? '我' : `用户 ${member.user_id}` }}</span>
          <span class="member-item-count">{{ member.items.length }} 道菜</span>
        </div>
        <div v-for="item in member.items" :key="item.food_id" class="member-item">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-qty">×{{ item.qty }}</span>
          <span class="item-price">¥{{ (item.price * item.qty).toFixed(2) }}</span>
          <!-- 自己的菜可以修改 -->
          <template v-if="member.user_id === myUserId && room.status === 'open'">
            <van-stepper v-model="item.qty" min="0" @change="(v) => handleQtyChange(item, v)" size="0.4rem" />
          </template>
        </div>
        <div v-if="!member.items.length" class="member-empty">还未选菜</div>
      </div>

      <!-- 合计 -->
      <div class="go-total">
        <span>预计合计</span>
        <span class="go-total-price">¥{{ totalPrice }}</span>
      </div>

      <!-- 发起人：确认下单 -->
      <div class="go-checkout" v-if="room.creator_id === myUserId && room.status === 'open'">
        <van-button block color="#ffd161" style="color:#333;font-weight:bold;" :loading="checkoutLoading" @click="handleCheckout">
          确认拼单下单 🚀
        </van-button>
        <p class="go-checkout-tip">确认后将合并所有成员的选菜，生成一个订单</p>
      </div>
      <div v-else-if="room.status === 'open'" class="go-waiting">
        <van-loading size="0.3rem" /> 等待发起人确认下单...
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'

const API_BASE = 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const room = ref(null)
const myUserId = ref(null)
const checkoutLoading = ref(false)
let pollTimer = null

const totalPrice = computed(() => {
  if (!room.value) return '0.00'
  let total = 0
  for (const member of room.value.members) {
    for (const item of member.items) {
      total += item.price * item.qty
    }
  }
  return total.toFixed(2)
})

async function fetchRoom() {
  const room_id = route.query.room
  if (!room_id) return
  try {
    const resp = await fetch(`${API_BASE}/v1/group_order/${room_id}`, { credentials: 'include' })
    const json = await resp.json()
    if (json.status === 200) room.value = json.data
    else if (json.status === -1) { clearInterval(pollTimer); room.value = null }
  } catch (e) {}
}

async function handleQtyChange(item, qty) {
  const room_id = route.query.room
  try {
    await fetch(`${API_BASE}/v1/group_order/${room_id}/item`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_id: item.food_id, qty: Number(qty), name: item.name, price: item.price })
    })
    await fetchRoom()
  } catch (e) {}
}

async function handleCheckout() {
  const room_id = route.query.room
  checkoutLoading.value = true
  try {
    const resp = await fetch(`${API_BASE}/v1/group_order/${room_id}/checkout`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address_id: 'default' })
    })
    const json = await resp.json()
    if (json.status === 200) {
      showToast({ message: `🎉 拼单成功！订单已生成`, position: 'bottom' })
      router.push({ path: '/pay', query: { order_id: json.data.order_id } })
    } else {
      showToast({ message: json.message || '下单失败', position: 'bottom' })
    }
  } catch (e) {
    showToast({ message: '网络错误', position: 'bottom' })
  }
  checkoutLoading.value = false
}

async function copyShareLink() {
  const room_id = route.query.room
  const link = `${window.location.origin}${window.location.pathname}#/group_order?room=${room_id}`
  try { await navigator.clipboard.writeText(link) } catch (e) {}
  showToast({ message: '✅ 链接已复制', position: 'bottom' })
}

// 首次进入时自动 join
async function initRoom() {
  const room_id = route.query.room
  if (!room_id) return
  try {
    // 先 join（重复 join 无副作用）
    await fetch(`${API_BASE}/v1/group_order/${room_id}/join`, { method: 'POST', credentials: 'include' })
    // 获取自己 user_id
    const infoResp = await fetch(`${API_BASE}/admin/user_info`, { credentials: 'include' })
    const infoJson = await infoResp.json()
    if (infoJson.id) myUserId.value = infoJson.id
  } catch (e) {}
  await fetchRoom()
}

onMounted(() => {
  initRoom()
  pollTimer = setInterval(fetchRoom, 5000)
})
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<style lang="scss" scoped>
@import "../../style/mixin.scss";

.group-order-page {
  min-height: 100vh;
  background: #f4f4f4;
  padding-bottom: 2rem;
}

.go-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 60vh; gap: 0.3rem;
  p { color: #999; font-size: 0.28rem; }
}

.go-header {
  background: #fff; padding: 0.2rem 0.3rem;
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0.2rem;
  .go-status { display: flex; flex-direction: column; gap: 0.06rem;
    .go-tag { font-size: 0.28rem; }
    .go-room-id { font-size: 0.22rem; color: #bbb; }
  }
  .go-share { font-size: 0.28rem; color: #f60; cursor: pointer; }
}

.section-title { font-size: 0.3rem; font-weight: bold; padding: 0.2rem 0.3rem; color: #333; }

.member-card {
  background: #fff; margin-bottom: 0.16rem;
  .member-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.2rem 0.3rem; border-bottom: 1px solid #f5f5f5;
    .member-name { font-size: 0.3rem; font-weight: 500; color: #333; }
    .member-item-count { font-size: 0.24rem; color: #999; }
  }
  .member-item {
    display: flex; align-items: center; gap: 0.2rem;
    padding: 0.16rem 0.3rem; border-bottom: 1px solid #f9f9f9;
    .item-name { flex: 1; font-size: 0.28rem; color: #333; }
    .item-qty { font-size: 0.24rem; color: #999; }
    .item-price { font-size: 0.26rem; color: #f60; min-width: 0.8rem; text-align: right; }
  }
  .member-empty { padding: 0.2rem 0.3rem; font-size: 0.26rem; color: #bbb; text-align: center; }
}

.go-total {
  background: #fff; padding: 0.24rem 0.3rem;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.28rem; color: #666; margin-bottom: 0.3rem;
  .go-total-price { font-size: 0.4rem; font-weight: bold; color: #333; }
}

.go-checkout {
  padding: 0 0.3rem;
  .go-checkout-tip { text-align: center; font-size: 0.22rem; color: #bbb; margin-top: 0.16rem; }
}

.go-waiting {
  display: flex; align-items: center; justify-content: center;
  gap: 0.16rem; padding: 0.3rem; font-size: 0.28rem; color: #999;
}
</style>
