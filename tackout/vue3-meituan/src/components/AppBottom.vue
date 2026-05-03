<template>
  <van-tabbar v-model="active" active-color="#ffd161" inactive-color="#999">
    <van-tabbar-item name="index" icon="wap-home-o" to="/index">首页</van-tabbar-item>
    <van-tabbar-item name="ai_chat" to="/ai_chat">
      <template #icon>
        <span :style="{ fontSize: '22px', lineHeight: 1 }">🤖</span>
      </template>
      AI推荐
    </van-tabbar-item>
    <van-tabbar-item name="order" icon="orders-o" to="/order">订单</van-tabbar-item>
    <van-tabbar-item name="message" to="/message">
      <template #icon>
        <van-badge :content="badgeContent" :show-zero="false">
          <van-icon name="bell" size="22" />
        </van-badge>
      </template>
      消息
    </van-tabbar-item>
    <van-tabbar-item name="home" icon="contact-o" to="/home">我的</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const API_BASE = 'http://localhost:3000'
const route = useRoute()
const active = ref('index')
const unreadCount = ref(0)
const badgeContent = ref('')

watch(unreadCount, (val) => {
  if (val <= 0) badgeContent.value = ''
  else if (val > 99) badgeContent.value = '99+'
  else badgeContent.value = String(val)
})

async function fetchUnreadCount() {
  try {
    const resp = await fetch(`${API_BASE}/v1/message/unread_count`, { credentials: 'include' })
    if (!resp.ok) return
    const json = await resp.json()
    unreadCount.value = (json.data && json.data.count) || 0
  } catch (e) { /* 静默 */ }
}

let pollTimer = null
function startPolling() { fetchUnreadCount(); pollTimer = setInterval(fetchUnreadCount, 30000) }
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }
function handleVisibilityChange() { document.hidden ? stopPolling() : startPolling() }

onMounted(() => { startPolling(); document.addEventListener('visibilitychange', handleVisibilityChange) })
onUnmounted(() => { stopPolling(); document.removeEventListener('visibilitychange', handleVisibilityChange) })

watch(
  () => route.path,
  (path) => {
    const name = path.slice(1).split('/')[0]
    if (['index', 'order', 'home', 'ai_chat', 'message'].includes(name)) {
      active.value = name
      if (name === 'message') setTimeout(fetchUnreadCount, 500)
    }
  },
  { immediate: true }
)
</script>
