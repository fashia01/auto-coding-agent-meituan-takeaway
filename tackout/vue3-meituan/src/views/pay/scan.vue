<template>
  <div id="scan-container">
    <header>
      <i class="iconfont pay-icon" :style="{ color: payTypeObj[payType]['color'] }"
        v-html="payTypeObj[payType]['icon']"></i>
      <span class="pay-way-name">{{ payTypeObj[payType]['name'] }}</span>
    </header>
    <div class="qrcode-container">
      <div id="qrcode" ref="qrcode"></div>
    </div>
    <div class="info-container">
      <ul>
        <li><span>产品名称：{{ orderData.tradeName }}</span></li>
        <li><span>订单编号：{{ orderData.outTradeNo }}</span></li>
        <li><span>订单金额：{{ orderData.amount / 100 }}</span></li>
        <li><span>实付金额：{{ orderData.amount / 100 }}</span></li>
      </ul>
    </div>
    <div class="close" @click="close()">
      <i class="iconfont icon-close">&#xe625;</i>
    </div>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from '@/plugins/qrcode'
import { listenStatus } from '@/api/order'

const router = useRouter()

const props = defineProps({
  payType: { type: String, default: '1' },
  orderData: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['close'])

const payTypeObj = {
  1: { icon: '&#xe60f;', color: '#3d91e4', name: '支付宝支付' },
  2: { icon: '&#xe62a;', color: '#2aaf90', name: '微信支付' }
}
const qrcode = ref(null)
const qrcodeEl = ref(null)
let timer = null
const alertText = ref('')
const showTip = ref(false)

function close() {
  clearInterval(timer)
  emit('close')
}

function listenStatusFn(outTradeNo) {
  clearInterval(timer)
  timer = setInterval(() => {
    listenStatus({ outTradeNo }).then((response) => {
      if (response.data.status === 200) {
        clearInterval(timer)
        alertText.value = '支付成功，准备跳转'
        showTip.value = true
        setTimeout(() => {
          router.push({ path: '/order_detail', query: { id: props.orderData.order_id } })
        }, 1000)
      }
    })
  }, 3000)
}

function mockPayment(countdown = 5) {
  alertText.value = '模拟支付中，请稍候... ' + countdown + '秒'
  showTip.value = true
  timer = setInterval(() => {
    countdown--
    if (countdown <= 0) {
      clearInterval(timer)
      alertText.value = '支付成功，准备跳转'
      showTip.value = true
      setTimeout(() => {
        router.push({ path: '/order_detail', query: { id: props.orderData.order_id } })
      }, 1000)
    } else {
      alertText.value = '模拟支付中，请稍候... ' + countdown + '秒'
    }
  }, 1000)
}

watch(() => props.orderData, (val) => {
  if (val.qrcode === 'mock_qrcode') {
    mockPayment(5)
    return
  }
  if (qrcode.value) {
    qrcode.value.makeCode(val.data.qrcode)
  } else {
    qrcode.value = new QRCode(qrcodeEl.value, {
      text: val.data.qrcode,
      width: 200,
      height: 200
    })
  }
  listenStatusFn(val.outTradeNo)
})

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
#scan-container {
  background: #fff;
  position: fixed;
  top: 0; right: 0; left: 0; bottom: 0;
  header { margin: 0.5rem 0; padding-left: 1rem; .pay-icon { font-size: 1.2rem; } .pay-way-name { font-weight: normal; font-size: 0.7rem; } }
  .qrcode-container { width: 200px; height: 200px; margin: 1rem auto; }
  .info-container { padding-left: 1rem; ul li { margin: 0.4rem 0; span { font-size: 0.4rem; } } }
  .close { margin: 0.5rem 0; text-align: center; .icon-close { font-size: 1rem; } }
}
</style>
