<!-- AI 智能推荐对话页面 -->
<template>
  <div id="ai-chat">
    <v-head title="AI智能点餐" goBack="true" bgColor="#fff"></v-head>

    <!-- 对话区 -->
    <div class="message-list" ref="msgList">
      <div class="welcome-tip">
        <span>👋 你好！告诉我你想吃什么，我帮你推荐</span>
      </div>

      <div v-for="(msg, index) in messages" :key="index" class="message-item">
        <chat-bubble :role="msg.role" :content="msg.content"></chat-bubble>

        <!-- 评判标准卡片 -->
        <div v-if="msg.criteria" class="criteria-card">
          <div class="criteria-title">📊 本次推荐评判标准</div>
          <div class="criteria-reason">{{ msg.criteria.reason }}</div>
          <div class="criteria-weights">
            <span v-for="(val, key) in msg.criteria.weights" :key="key" class="weight-tag">
              {{ weightLabel(key) }} {{ val }}
            </span>
          </div>
          <div class="criteria-meta">
            从 {{ msg.criteria.candidate_count }} 款候选菜品中，综合打分推荐前 {{ msg.criteria.top_n }} 款
          </div>
        </div>

        <!-- 菜品推荐卡片 -->
        <div v-if="msg.foods && msg.foods.length > 0" class="food-cards">
          <food-card
            v-for="(food, fi) in msg.foods"
            :key="fi"
            :food="food"
            :rank="fi + 1"
            @order="handleOrder"
          ></food-card>
        </div>
      </div>

      <div class="bottom-spacer"></div>
    </div>

    <!-- 底部输入框 -->
    <chat-input :disabled="isLoading" @send="sendMessage"></chat-input>
  </div>
</template>

<script setup>
/* eslint-disable no-console */
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores'
import ChatBubble from './components/ChatBubble.vue'
import FoodCard from './components/FoodCard.vue'
import ChatInput from './components/ChatInput.vue'

const API_BASE = 'http://localhost:3000'

const router = useRouter()
const cartStore = useCartStore()

const messages = ref([])
const isLoading = ref(false)
const msgList = ref(null)

function scrollToBottom() {
  const el = msgList.value
  if (el) el.scrollTop = el.scrollHeight
}

async function sendMessage(text) {
  if (!text || isLoading.value) return

  // 1. 推入用户消息
  messages.value.push({ role: 'user', content: text, foods: [] })

  // 2. 推入占位助手消息
  const assistantIndex = messages.value.length
  messages.value.push({ role: 'assistant', content: '', foods: [], criteria: null })

  isLoading.value = true
  nextTick(() => scrollToBottom())

  // 构建发送给后端的消息体
  const payload = messages.value
    .filter(m => !(m.role === 'assistant' && !m.content))
    .map(m => ({ role: m.role, content: m.content }))

  try {
    const response = await fetch(`${API_BASE}/v1/ai/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    let reading = true
    while (reading) {
      const { done, value } = await reader.read()
      if (done) { reading = false; break }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        let event
        try { event = JSON.parse(line.slice(6)) } catch (e) { continue }

        if (event.type === 'status') {
          messages.value[assistantIndex].content = event.content
        } else if (event.type === 'foods') {
          messages.value[assistantIndex].foods = event.data || []
        } else if (event.type === 'criteria') {
          messages.value[assistantIndex].criteria = event.data
        } else if (event.type === 'text') {
          if (messages.value[assistantIndex].content === '正在为您分析需求并搜索菜品...') {
            messages.value[assistantIndex].content = ''
          }
          messages.value[assistantIndex].content += event.content
        } else if (event.type === 'error') {
          messages.value[assistantIndex].content = event.content || '服务暂时不可用，请稍后重试'
        } else if (event.type === 'done') {
          isLoading.value = false
        }

        nextTick(() => scrollToBottom())
      }
    }
  } catch (err) {
    console.error('[AI Chat] fetch error:', err)
    messages.value[assistantIndex].content = '网络异常，请检查连接后重试'
  } finally {
    isLoading.value = false
    nextTick(() => scrollToBottom())
  }
}

function handleOrder(food) {
  const confirmOrderData = {
    restaurant_id: food.restaurant_id,
    foods: {
      totalPrice: String(food.price),
      totalNum: 1,
      restaurant_name: food.restaurant_name,
      pic_url: food.restaurant_pic,
      [food.food_id]: {
        name: food.food_name,
        price: food.price,
        foods_pic: food.pic_url,
        num: 1,
        id: food.food_id
      }
    }
  }

  localStorage.setItem('confirmOrderData', JSON.stringify(confirmOrderData))

  // 同步 Pinia cart
  cartStore.addCart({
    restaurant_id: food.restaurant_id,
    restaurant_name: food.restaurant_name,
    pic_url: food.restaurant_pic,
    food_id: food.food_id,
    price: food.price,
    name: food.food_name,
    foods_pic: food.pic_url
  })

  router.push('/confirm_order')
}

function weightLabel(key) {
  const map = {
    price: '💰 价格',
    sales: '🔥 销量',
    restaurant_score: '⭐ 评分',
    praise: '👍 点赞'
  }
  return map[key] || key
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

#ai-chat {
  background: #f4f4f4;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding-top: 0.2rem;
  @include px2rem(margin-top, 80);
  padding-bottom: 1.4rem;
}

.welcome-tip {
  text-align: center; padding: 0.3rem 0.4rem; margin: 0.2rem 0.3rem 0;
  background: #fff; border-radius: 0.2rem; font-size: 0.32rem; color: #666;
  box-shadow: 0 0.02rem 0.1rem rgba(0,0,0,0.06);
}

.message-item { margin-bottom: 0.1rem; }
.food-cards { padding: 0 0; }

.criteria-card {
  margin: 0.1rem 0.3rem 0.05rem;
  padding: 0.25rem 0.3rem;
  background: #fffbee;
  border: 1px solid #ffe58f;
  border-radius: 0.16rem;
  font-size: 0.28rem;
  .criteria-title { font-size: 0.3rem; font-weight: bold; color: #333; margin-bottom: 0.1rem; }
  .criteria-reason { color: #666; margin-bottom: 0.15rem; line-height: 1.5; }
  .criteria-weights {
    display: flex; flex-wrap: wrap; gap: 0.12rem; margin-bottom: 0.1rem;
    .weight-tag { background: #fff7e0; border: 1px solid $mtYellow; border-radius: 0.3rem; padding: 0.05rem 0.18rem; color: #b36a00; font-size: 0.26rem; white-space: nowrap; }
  }
  .criteria-meta { color: #999; font-size: 0.26rem; }
}

.bottom-spacer { height: 0.4rem; }
</style>
