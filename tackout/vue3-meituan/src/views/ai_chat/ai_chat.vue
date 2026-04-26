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

        <!-- 套餐规划卡片 -->
        <ComboCard
          v-if="msg.combo"
          :combo="msg.combo"
          @added="() => {}"
          @checkout="router.push('/confirm_order')"
        />

        <!-- 购物车操作结果卡片 -->
        <CartActionCard
          v-if="msg.cartAction"
          :action="msg.cartAction"
          @checkout="router.push('/confirm_order')"
        />

        <!-- 跨店冲突提示 -->
        <div v-if="msg.cartConflict" class="cart-conflict-card">
          <p class="conflict-tip">⚠️ 您的购物车已有「{{ msg.cartConflict.oldRestaurantName }}」的菜品</p>
          <p class="conflict-sub">是否清空并加入新餐馆的菜品？</p>
          <div class="conflict-actions">
            <van-button size="small" round color="#ffd161"
              @click="confirmCrossStore(msg.cartConflict)">
              清空并加入
            </van-button>
            <van-button size="small" round plain @click="msg.cartConflict = null">
              取消
            </van-button>
          </div>
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
import CartActionCard from './components/CartActionCard.vue'
import ComboCard from './components/ComboCard.vue'

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

  // ── 客户端快捷加购：匹配"加入购物车"意图，直接操作购物车不走 LLM ──
  const addCartKeywords = ['加入购物车', '下单这个', '就要这个', '帮我点这个', '全部加入', '都加入']
  const clearCartKeywords = ['清空购物车', '重新来', '都不要了', '清空']
  const viewCartKeywords = ['看看购物车', '购物车里有什么', '查看购物车']

  if (clearCartKeywords.some(k => text.includes(k))) {
    Object.keys(cartStore.cartList).forEach(rid => cartStore.emptyCart({ restaurant_id: rid }))
    messages.value.push({ role: 'user', content: text })
    messages.value.push({ role: 'assistant', content: '🗑️ 购物车已清空，可以重新告诉我你想吃什么～', cartAction: { action: 'clear', success: true } })
    nextTick(() => scrollToBottom())
    return
  }

  if (viewCartKeywords.some(k => text.includes(k))) {
    messages.value.push({ role: 'user', content: text })
    messages.value.push({ role: 'assistant', content: '这是您当前的购物车：', cartAction: { action: 'view', success: true } })
    nextTick(() => scrollToBottom())
    return
  }

  if (addCartKeywords.some(k => text.includes(k))) {
    // 从对话历史中找最近一条包含推荐菜品的 assistant 消息
    const lastFoodsMsg = [...messages.value].reverse().find(m => m.role === 'assistant' && m.foods && m.foods.length > 0)
    if (lastFoodsMsg && lastFoodsMsg.foods.length > 0) {
      const targetFoods = lastFoodsMsg.foods
      // 解析"第N个"或"全部"
      let toAdd = targetFoods
      const numMatch = text.match(/第([一1两2二三3四4五5六6七7八8九9十10]+)个/)
      if (numMatch) {
        const numMap = { '一':0,'1':0,'两':1,'二':1,'2':1,'三':2,'3':2,'四':3,'4':3,'五':4,'5':4 }
        const idx = numMap[numMatch[1]] ?? 0
        toAdd = [targetFoods[idx]].filter(Boolean)
      }

      const items = toAdd.map(f => ({
        food_id: f.food_id,
        name: f.food_name,
        price: f.price,
        quantity: 1,
        restaurant_id: f.restaurant_id,
        restaurant_name: f.restaurant_name,
        restaurant_pic: f.restaurant_pic || '',
        pic_url: f.pic_url || ''
      }))

      let crossStoreErr = null
      items.forEach(item => {
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
          if (e.message === 'CROSS_STORE') crossStoreErr = e
        }
      })

      if (crossStoreErr) {
        // 跨店：显示冲突确认卡片，暂不写入购物车
        messages.value.push({ role: 'user', content: text })
        messages.value.push({
          role: 'assistant',
          content: `⚠️ 您的购物车已有「${crossStoreErr.oldRestaurantName}」的菜品`,
          cartConflict: { oldRestaurantName: crossStoreErr.oldRestaurantName, pendingItems: items }
        })
        nextTick(() => scrollToBottom())
        return
      }

      messages.value.push({ role: 'user', content: text })
      messages.value.push({
        role: 'assistant',
        content: `✅ 已将 ${items.map(i => i.name).join('、')} 加入购物车`,
        cartAction: { action: 'add', success: true, items }
      })
      nextTick(() => scrollToBottom())
      return
    }
    // 找不到推荐菜品，提示用户先推荐
    messages.value.push({ role: 'user', content: text })
    messages.value.push({ role: 'assistant', content: '请先告诉我你想吃什么，我推荐后你可以直接说"加入购物车"或"把第一个加入"～' })
    nextTick(() => scrollToBottom())
    return
  }
  // ── 加购意图检测结束，以下走 LLM 流程 ──
  messages.value.push({ role: 'user', content: text, foods: [] })

  // 2. 推入占位助手消息
  const assistantIndex = messages.value.length
  messages.value.push({ role: 'assistant', content: '', foods: [], criteria: null, combo: null })

  isLoading.value = true
  nextTick(() => scrollToBottom())

  // 检测否定意图：若上一条 assistant 有推荐且用户明确拒绝，收集被拒绝的 food_ids
  const negativeKeywords = ['不要', '换一个', '不喜欢', '不吃', '不行', '算了', '换个', '别这个']
  let rejectedFoodIds = []
  if (negativeKeywords.some(k => text.includes(k))) {
    const lastFoodsMsg = [...messages.value].reverse().find(m => m.role === 'assistant' && m.foods && m.foods.length > 0)
    if (lastFoodsMsg) {
      rejectedFoodIds = lastFoodsMsg.foods.map(f => f.food_id).filter(Boolean)
    }
  }

  // 构建发送给后端的消息体
  const payload = messages.value
    .filter(m => !(m.role === 'assistant' && !m.content && !m._foodIdsCtx))
    .map(m => ({
      role: m.role,
      // assistant 消息：content + 隐藏的菜品 ID 上下文（不显示给用户，但 AI 能看到）
      content: m._foodIdsCtx ? (m.content + m._foodIdsCtx) : m.content
    }))

  try {
    const response = await fetch(`${API_BASE}/v1/ai/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: payload,
        ...(rejectedFoodIds.length ? { rejected_food_ids: rejectedFoodIds } : {})
      })
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
        } else if (event.type === 'combo') {
          // 套餐规划结果
          messages.value[assistantIndex].combo = event.data || null
        } else if (event.type === 'food_ids_ctx') {
          // 隐藏的菜品 ID 上下文，追加到 assistant content 但不显示给用户
          // AI 下一轮对话可以从 message history 中看到这些 food_id
          messages.value[assistantIndex]._foodIdsCtx = event.content
        } else if (event.type === 'cart_action') {
          // 购物车操作事件：执行实际购物车动作
          const cartData = event.data || {}
          if (cartData.action === 'add' && cartData.success && cartData.items) {
            // 检测跨店冲突
            const existingKeys = Object.keys(cartStore.cartList)
            const newRestId = cartData.items[0] && cartData.items[0].restaurant_id
            const hasCrossStore = existingKeys.length > 0 && !cartStore.cartList[newRestId]
            if (hasCrossStore && !cartData.force) {
              const oldName = cartStore.cartList[existingKeys[0]] && cartStore.cartList[existingKeys[0]].restaurant_name
              messages.value[assistantIndex].cartConflict = {
                oldRestaurantName: oldName,
                pendingItems: cartData.items
              }
            } else {
              // 跨店时先清空
              if (hasCrossStore && cartData.force) {
                existingKeys.forEach(rid => cartStore.emptyCart({ restaurant_id: rid }))
              }
              // 执行加购
              cartData.items.forEach(item => {
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
                  } catch (e) { /* 跨店保护已由 force 处理 */ }
                }
              })
              messages.value[assistantIndex].cartAction = cartData
            }
          } else if (cartData.action === 'clear') {
            // 清空所有购物车
            Object.keys(cartStore.cartList).forEach(rid => cartStore.emptyCart({ restaurant_id: rid }))
            messages.value[assistantIndex].cartAction = cartData
          } else if (cartData.action === 'view') {
            messages.value[assistantIndex].cartAction = cartData
          }
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

// 跨店冲突确认：清空旧购物车后加入新菜品
function confirmCrossStore(conflict) {
  Object.keys(cartStore.cartList).forEach(rid => cartStore.emptyCart({ restaurant_id: rid }))
  conflict.pendingItems.forEach(item => {
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
      } catch (e) { /* ignore */ }
    }
  })
  // 将冲突状态替换为成功状态，显示 CartActionCard
  const msgIdx = messages.value.findIndex(m => m.cartConflict === conflict)
  if (msgIdx !== -1) {
    messages.value[msgIdx].cartConflict = null
    messages.value[msgIdx].cartAction = { action: 'add', success: true, items: conflict.pendingItems }
  }
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

.cart-conflict-card {
  margin: 0.2rem 0.3rem 0.1rem;
  padding: 0.24rem 0.3rem;
  background: #fff7e6;
  border: 1px solid #ffd161;
  border-radius: 0.16rem;
  .conflict-tip { font-size: 0.3rem; font-weight: bold; color: #333; margin: 0 0 0.08rem; }
  .conflict-sub { font-size: 0.28rem; color: #777; margin: 0 0 0.2rem; }
  .conflict-actions { display: flex; gap: 0.2rem; }
}

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
