<template>
  <div id="order-detail">
    <v-head goBack="true" title="订单详情"></v-head>

    <!-- 状态标题 -->
    <section class="tip">
      <h3>{{ orderStatus }}</h3>
      <h4>{{ statusDesc }}</h4>
      <div class="button-group">
        <router-link class="action-btn" :to="{ path: '/store', query: { id: restaurantInfo.id } }" tag="span">再来一单</router-link>
        <router-link v-if="orderData.code === 200 && !orderData.has_comment" class="action-btn comment-btn" :to="{ path: '/make_comment', query: { order_id: orderData.id } }" tag="span">去评价</router-link>
        <span v-if="canUrge" class="action-btn urge-btn" @click="handleUrge">催一下 🚀</span>
        <span v-if="canCancel" class="action-btn cancel-btn" @click="handleCancel">申请退款</span>
      </div>
      <div class="estimated-time" v-if="orderData.estimated_delivery_time && !isTerminal">
        预计 {{ formatTime(orderData.estimated_delivery_time) }} 送达
      </div>
    </section>

    <!-- 实时配送进度条（非终态时显示） -->
    <section v-if="!isTerminal && orderData.code === 200" class="progress-section">
      <DeliveryProgress :status="orderData.status" :eta="etaMs" />
    </section>

    <!-- 菜品信息 -->
    <section class="foods-info-container">
      <div class="title">
        <span class="restaurant-picture"><img :src="restaurantInfo.pic_url" alt=""></span>
        <span class="restaurant-name">{{ restaurantInfo.name }}</span>
        <span class="icon"><i class="iconfont"></i></span>
      </div>
      <div class="foods-container" v-for="(item, index) in foods" :key="index">
        <span class="foods-picture"><img :src="item.pic_url" alt=""></span>
        <div class="main-container">
          <div>
            <span class="foods-name">{{ item.name }}</span>
            <span class="price">￥{{ Number(item.price * item.num).toFixed(2) }}</span>
          </div>
          <span class="num">x{{ item.num }}</span>
        </div>
      </div>
      <div class="other-fee">
        <div class="food-container-fee"><span class="fee-name">餐盒费</span><span class="price">￥0</span></div>
        <div class="delivery-fee"><span class="fee-name">配送费</span><span class="price">￥{{ restaurantInfo.shipping_fee }}</span></div>
      </div>
      <div class="total-price border-top">
        <span class="total-price">总计￥{{ orderData.total_price ? orderData.total_price.toFixed(2) : '0.00' }} </span>
        <span class="discount-price" v-if="orderData.discount_amount > 0">优惠￥{{ orderData.discount_amount }}</span>
        <span class="discount-price" v-else>优惠￥0</span>
        <span class="pay-price"> 实付 <strong>￥{{ orderData.total_price ? orderData.total_price.toFixed(2) : '0.00' }}</strong></span>
      </div>
      <div class="call-seller-container border-top"><span>联系商家</span></div>
    </section>

    <!-- 配送信息 -->
    <section class="delivery-info-container">
      <div class="expect-delivery-time">
        <span class="item-name">期望时间</span><span class="item-value">立即配送</span>
      </div>
      <div class="delivery-address">
        <div><span class="item-name">配送地址</span><span class="item-value" style="display: block;">&nbsp;</span></div>
        <div class="address-info">
          <span class="person-info item-value">{{ address.name }}({{ address.gender === 'male' ? '先生' : '女士' }}){{ address.phone }}</span>
          <span class="address item-value">{{ address.address }}</span>
        </div>
      </div>
      <div class="delivery-service">
        <span class="item-name">配送服务</span><span class="item-value">由 商家 提供配送服务</span>
      </div>
    </section>

    <!-- 订单信息 -->
    <section class="order-info-container">
      <div class="order-number">
        <span class="item-name">订单号码</span>
        <span class="item-value">{{ orderData.id }}</span>
        <span class="copy-order-number">复制</span>
      </div>
      <div class="order-time">
        <span class="item-name">订单时间</span><span class="item-value">{{ orderData.create_time }}</span>
      </div>
      <div class="delivery-way">
        <span class="item-name">支付方式</span><span class="item-value">在线支付</span>
      </div>
    </section>

    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { orderInfo, urgeOrder, cancelOrder } from '@/api/order'
import DeliveryProgress from './components/DeliveryProgress.vue'

const API_BASE = 'http://localhost:3000'

const route = useRoute()
const orderStatus = ref('')
const statusDesc = ref('')
const restaurantInfo = ref({})
const foods = ref([])
const orderData = ref({ total_price: 0, status_history: [], urge_count: 0 })
const address = ref({})
const alertText = ref('')
const showTip = ref(false)
const etaMs = ref(null)  // 预计送达时间戳（ms）

const TERMINAL = new Set(['delivered', 'cancelled'])
const isTerminal = computed(() => TERMINAL.has(orderData.value.status))

const canUrge = computed(() => {
  const s = orderData.value.status
  return (s === 'preparing' || s === 'delivering') && (orderData.value.urge_count || 0) < 1
})

const canCancel = computed(() => !isTerminal.value && orderData.value.status !== '未支付' && orderData.value.code === 200)

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const STATUS_LABELS = {
  '未支付': { title: '等待支付', desc: '请尽快完成支付，超时将自动取消' },
  '支付成功': { title: '已支付', desc: '商家正在处理您的订单' },
  'accepted':  { title: '商家已接单', desc: '商家正在为您准备餐品' },
  'preparing': { title: '备餐中', desc: '商家正在精心准备您的餐品' },
  'delivering':{ title: '配送中', desc: '骑手正在飞速赶来，请稍候' },
  'delivered': { title: '已送达', desc: '餐品已送达，感谢您的使用' },
  'cancelled': { title: '订单已取消', desc: '如有疑问请联系客服' },
}

function applyOrderData(data) {
  orderData.value = data
  const info = STATUS_LABELS[data.status] || { title: data.status || '订单详情', desc: '' }
  orderStatus.value = info.title
  statusDesc.value = info.desc
  restaurantInfo.value = data.restaurant || {}
  foods.value = data.foods || []
  address.value = data.address || {}
}

let pollTimer = null
function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    try {
      const res = await orderInfo({ order_id: route.query.id })
      if (res.data?.status === 200) {
        applyOrderData(res.data.data)
        if (TERMINAL.has(res.data.data.status)) stopPolling()
      }
    } catch (e) { /* 静默忽略 */ }
  }, 5000)
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// ── SSE 实时订阅 ──────────────────────────────────────────────
let sseSource = null

function startSSE(order_id) {
  if (sseSource) sseSource.close()
  sseSource = new EventSource(`${API_BASE}/v1/order/subscribe/${order_id}`, { withCredentials: true })

  sseSource.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data)
      if (event.type === 'status_update') {
        const info = STATUS_LABELS[event.status] || { title: event.status, desc: '' }
        orderStatus.value = info.title
        statusDesc.value = info.desc
        orderData.value = { ...orderData.value, status: event.status }
        if (event.eta_ms) etaMs.value = event.eta_ms
      } else if (event.type === 'done') {
        sseSource.close()
        sseSource = null
      }
    } catch (err) { /* 解析失败静默 */ }
  }

  sseSource.onerror = async () => {
    // 断线重连：先同步最新状态
    try {
      const res = await fetch(`${API_BASE}/v1/order/progress/${order_id}`, { credentials: 'include' })
      const json = await res.json()
      if (json.status === 200 && json.data) {
        const d = json.data
        const info = STATUS_LABELS[d.status] || { title: d.status, desc: '' }
        orderStatus.value = info.title
        statusDesc.value = info.desc
        orderData.value = { ...orderData.value, status: d.status, status_history: d.status_history || [] }
        if (d.estimated_delivery_time) etaMs.value = new Date(d.estimated_delivery_time).getTime()
        if (TERMINAL.has(d.status)) { sseSource && sseSource.close(); sseSource = null }
      }
    } catch (e) { /* 静默 */ }
    // EventSource 会自动重连，无需手动处理
  }
}

function stopSSE() {
  if (sseSource) { sseSource.close(); sseSource = null }
}

async function handleUrge() {
  try {
    const res = await urgeOrder({ order_id: orderData.value.id })
    const msg = res.data?.status === 200 ? (res.data.message || '已催单 🚀') : (res.data?.message || '催单失败')
    showToast({ message: msg, position: 'bottom' })
    if (res.data?.status === 200) orderData.value = { ...orderData.value, urge_count: (orderData.value.urge_count || 0) + 1 }
  } catch { showToast({ message: '网络错误，请重试', position: 'bottom' }) }
}

async function handleCancel() {
  try {
    await showConfirmDialog({
      title: '申请退款',
      message: '确认要取消订单并申请退款吗？退款将在1-3个工作日内到账。',
      confirmButtonText: '确认退款',
      cancelButtonText: '再想想',
    })
    const res = await cancelOrder({ order_id: orderData.value.id })
    if (res.data?.status === 200) {
      showToast({ message: res.data.message || '退款申请已提交', position: 'bottom' })
      orderData.value = { ...orderData.value, status: 'cancelled' }
      orderStatus.value = '订单已取消'
      statusDesc.value = '退款将在1-3个工作日内到账'
      stopPolling()
    } else {
      showToast({ message: res.data?.message || '操作失败', position: 'bottom' })
    }
  } catch { /* 用户取消确认 */ }
}

onMounted(() => {
  const id = route.query.id
  orderInfo({ order_id: id }).then((response) => {
    const res = response.data
    if (res.status === -1) { alertText.value = '获取订单失败'; showTip.value = true; return }
    applyOrderData(res.data)
    if (res.data.estimated_delivery_time) etaMs.value = new Date(res.data.estimated_delivery_time).getTime()
    // 非终态时建立 SSE 连接（优先），回退到轮询
    if (!TERMINAL.has(res.data.status) && res.data.code === 200) {
      if (typeof EventSource !== 'undefined') {
        startSSE(id)
      } else {
        startPolling()
      }
    }
  })
})

onUnmounted(() => { stopPolling(); stopSSE() })
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

$shallow_grey: #838383;
#order-detail {
  margin-top: 0.2rem;
  background: #f4f4f4;

  .tip {
    margin-top: 0.4rem; text-align: center; background: #fff; padding-bottom: 0.3rem;
    h3 { padding: 0.4rem 0; font-size: 0.5rem; font-weight: 600; }
    h4 { padding: 0.1rem 0 0.2rem; color: $shallow_grey; font-size: 0.36rem; }
    .button-group { display: flex; justify-content: center; gap: 0.2rem; padding: 0.3rem 0.2rem 0; flex-wrap: wrap; }
    .action-btn {
      display: inline-block; text-align: center; font-size: 0.3rem;
      @include px2rem(line-height, 60); @include px2rem(min-width, 150);
      padding: 0 0.2rem; border-radius: 0.06rem; background: #ffd161; color: #333;
      &.comment-btn { background: #4aaaff; color: #fff; }
      &.urge-btn { background: #ff6034; color: #fff; }
      &.cancel-btn { background: #fff; color: #999; border: 1px solid #ddd; }
    }
    .estimated-time { margin-top: 0.2rem; font-size: 0.28rem; color: #ff6034; }
  }

  .progress-section { background: #fff; margin: 0.2rem 0; padding: 0.1rem 0 0.2rem; }

  .foods-info-container {
    .title { margin: 0.2rem 0; display: flex; align-items: center; background: #fff; @include px2rem(height, 105); .restaurant-picture { @include px2rem(width, 40); @include px2rem(height, 40); img { width: 100%; height: 100%; } } .restaurant-name { font-size: 0.4rem; color: $shallow_grey; } }
    .foods-container { display: flex; .foods-picture { display: inline-block; margin-right: 0.3rem; @include px2rem(width, 110); @include px2rem(height, 110); img { width: 100%; height: 100%; } } .main-container { flex: 1; div:first-child { display: flex; font-size: 0.4rem; .foods-name { flex: 1; } } & > span { margin: 0.2rem 0; display: block; font-size: 0.4rem; color: $shallow_grey; } } }
    .other-fee { .food-container-fee, .delivery-fee { margin: 0.4rem 0; display: flex; } .fee-name { flex: 1; font-size: 0.4rem; } .price { font-size: 0.5rem; } }
    .total-price { text-align: right; padding: 0.3rem 0; .total-price, .discount-price { font-size: 0.4rem; } .pay-price { font-weight: 600; font-size: 0.45rem; strong { color: #fb4e44; } } }
    .call-seller-container { background: #fff; text-align: center; @include px2rem(line-height, 95); span { font-size: 0.5rem; } }
  }

  .item-name { margin-right: 0.4rem; font-size: 0.45rem; color: $shallow_grey; }
  .item-value { font-size: 0.4rem; flex: 1; }
  & > section { margin: 0 0.3rem; padding: 0 0.2rem; background: #fff; }
  .border-top { border-top: 1px solid $mtGrey; }
  .delivery-info-container, .order-info-container { & > div { display: flex; align-items: center; @include px2rem(height, 90); } }
  .delivery-info-container { .delivery-address { display: flex; .address-info { flex: 1; .address { display: block; } } } }
  .order-info-container { margin-top: 0.3rem; .copy-order-number { font-size: 0.4rem; display: inline-block; text-align: center; border: 1px solid $mtGrey; @include px2rem(width, 100); @include px2rem(line-height, 50); } }
}
</style>
