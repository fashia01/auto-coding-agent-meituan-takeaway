<template>
  <div class="message-page">
    <v-head title="消息中心" goBack="true">
      <template #right>
        <span class="read-all-btn" @click="handleReadAll">全部已读</span>
      </template>
    </v-head>

    <!-- 分类 Tab -->
    <van-tabs v-model:active="activeTab" color="#ffd161" title-active-color="#333" sticky>
      <van-tab v-for="tab in tabs" :key="tab.key" :title="tab.label" :name="tab.key">
        <!-- 消息列表 -->
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="msg-item"
            :class="{ 'msg-item--unread': !msg.is_read }"
            @click="handleMsgClick(msg)"
          >
            <div class="msg-icon">{{ categoryIcon(msg.category) }}</div>
            <div class="msg-body">
              <div class="msg-title">{{ msg.title }}</div>
              <div class="msg-content">{{ msg.content }}</div>
              <div class="msg-time">{{ formatRelativeTime(msg.created_at) }}</div>
            </div>
            <div v-if="!msg.is_read" class="msg-dot"></div>
          </div>

          <div v-if="!loading && messages.length === 0" class="msg-empty">
            <span>暂无消息</span>
          </div>
        </van-list>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'

const API_BASE = 'http://localhost:3000'
const router = useRouter()

const tabs = [
  { key: '', label: '全部' },
  { key: 'order', label: '📦 订单' },
  { key: 'coupon', label: '🎫 优惠' },
  { key: 'ai', label: '🤖 AI' },
  { key: 'system', label: '📢 系统' }
]
const activeTab = ref('')
const messages = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function categoryIcon(cat) {
  const map = { order: '📦', coupon: '🎫', ai: '🤖', system: '📢' }
  return map[cat] || '📩'
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}

async function fetchMessages(reset = false) {
  if (reset) { messages.value = []; page.value = 1; finished.value = false }
  loading.value = true
  try {
    const cat = activeTab.value ? `&category=${activeTab.value}` : ''
    const resp = await fetch(`${API_BASE}/v1/message/list?page=${page.value}${cat}`, { credentials: 'include' })
    const json = await resp.json()
    const list = json.data || []
    messages.value = reset ? list : [...messages.value, ...list]
    if (list.length < 20) finished.value = true
    else page.value++
  } catch (e) { finished.value = true }
  loading.value = false
}

function onLoad() { fetchMessages() }

watch(activeTab, () => fetchMessages(true), { immediate: true })

async function handleMsgClick(msg) {
  // 标记已读
  if (!msg.is_read) {
    msg.is_read = true
    fetch(`${API_BASE}/v1/message/${msg.id}/read`, { method: 'POST', credentials: 'include' })
  }
  // 跳转关联页面
  if (msg.related_type === 'order' && msg.related_id) {
    router.push(`/order_detail?id=${msg.related_id}`)
  } else if (msg.related_type === 'coupon') {
    router.push('/coupon')
  }
}

async function handleReadAll() {
  await fetch(`${API_BASE}/v1/message/read_all`, { method: 'POST', credentials: 'include' })
  messages.value = messages.value.map(m => ({ ...m, is_read: true }))
  showToast({ message: '全部已读', position: 'bottom' })
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

.message-page {
  min-height: 100vh;
  background: #f4f4f4;
  padding-bottom: 1.2rem;
}

.read-all-btn {
  font-size: 0.28rem;
  color: #ffa500;
  padding: 0.1rem 0.2rem;
}

.msg-item {
  display: flex;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.28rem 0.3rem;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  position: relative;

  &--unread {
    background: #fffdf5;
  }

  .msg-icon { font-size: 0.48rem; flex-shrink: 0; margin-top: 0.04rem; }

  .msg-body {
    flex: 1;
    min-width: 0;

    .msg-title {
      font-size: 0.3rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 0.06rem;
      @include ellipsis;
    }

    .msg-content {
      font-size: 0.26rem;
      color: #666;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .msg-time {
      font-size: 0.22rem;
      color: #bbb;
      margin-top: 0.08rem;
    }
  }

  .msg-dot {
    width: 0.16rem;
    height: 0.16rem;
    background: #f60;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 0.1rem;
  }
}

.msg-empty {
  text-align: center;
  padding: 1rem 0;
  color: #bbb;
  font-size: 0.3rem;
}
</style>
