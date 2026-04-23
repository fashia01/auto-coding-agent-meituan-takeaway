<template>
  <div id="confirm-order">
    <v-head title="提交订单" goBack="true" bgColor="#f4f4f4"></v-head>
    <div class="delivery-info-container">
      <router-link class="info-container address-container" v-if="emptyAddress" to="/add_address">
        <div class="address-info">
          <i class="iconfont icon-add">&#xe600;</i>
          <span class="add-text">新增收货地址</span>
        </div>
        <i class="iconfont icon-right">&#xe63f;</i>
      </router-link>
      <router-link class="info-container address-container" to="/confirm_order/address" v-else>
        <div class="address-info">
          <i class="iconfont icon-location">&#xe604;</i>
          <div class="main-info">
            <p class="address">{{ defineAddress.address }}</p>
            <span class="name">{{ defineAddress.name }}</span>
            <span class="gender">{{ gender }}</span>
            <span class="phone">{{ defineAddress.phone }}</span>
          </div>
        </div>
        <i class="iconfont icon-right">&#xe63f;</i>
      </router-link>
      <div class="info-container arrival-container">
        <div class="arrival-info">
          <i class="iconfont icon-time">&#xe621;</i>
          <div class="main-info">
            <span class="date-type-tip">送达时间</span>
            <span class="select-view-time">{{ estimatedArrivalTime }}</span>
          </div>
        </div>
        <i class="iconfont icon-right">&#xe63f;</i>
      </div>
    </div>

    <div class="container">
      <div class="head" v-if="poi_info">
        <i class="poi-icon" :style="{ backgroundImage: 'url(' + poi_info.pic_url + ')' }"></i>
        <span class="poi-name">{{ poi_info.name }}</span>
        <span class="delivery-type-icon"
          :style="{ backgroundImage: 'url(http://p0.meituan.net/aichequan/019c6ba10f8e79a694c36a474d09d81b2000.png)' }">
        </span>
      </div>
      <ul class="food-list">
        <li v-for="(item, key) in order_data" :key="key" v-if="Number(key)">
          <div class="picture">
            <img :src="item.foods_pic">
          </div>
          <div class="food-list-right-part">
            <div>
              <span class="name">{{ item.name }}</span>
              <span class="price">￥{{ item.price }}</span>
            </div>
            <div>
              <span class="count">x{{ item.num }}</span>
            </div>
          </div>
        </li>
      </ul>
      <ul class="other-fee-container">
        <li><span>包装费</span><span class="box-total-price">￥0</span></li>
        <li><span>配送费</span><span>￥0</span></li>
      </ul>
      <div class="total-price-container">
        <span>已优惠￥{{ discountAmount }}</span>
        <span class="total-price">小计<strong>￥{{ finalPrice }}</strong></span>
      </div>
    </div>

    <!-- 优惠券选择行 -->
    <div class="coupon-container">
      <CouponSelector v-model="selectedCoupon" :coupons="availableCoupons" />
      <div class="coupon-saving-tip" v-if="selectedCoupon">
        <van-tag type="danger">已优惠 ￥{{ discountAmount }}</van-tag>
      </div>
    </div>

    <div class="bottom">
      <div class="left">
        <span class="discount-fee" v-if="discountAmount > 0">已优惠￥{{ discountAmount }}</span>
        <span class="discount-fee" v-else>已优惠￥0</span>
        <span class="total">合计<strong>￥{{ finalPrice }}</strong></span>
      </div>
      <span class="submit" @click="submit()">提交订单</span>
    </div>
    <router-view></router-view>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAddressStore } from '@/stores'
import { getRestaurant } from '@/api/restaurant'
import { getAllAddress } from '@/api/user'
import { submitOrder, getAvailableCoupons } from '@/api/order'
import CouponSelector from '@/components/CouponSelector.vue'

const router = useRouter()
const addressStore = useAddressStore()
const { deliveryAddress } = storeToRefs(addressStore)

const order_data = ref(null)
const defineAddress = ref({})
const poi_info = ref(null)
const totalPrice = ref(0)
const totalNum = ref(0)
const restaurant_id = ref(null)
const emptyAddress = ref(true)
const alertText = ref('')
const showTip = ref(false)
const preventRepeat = ref(false)

// 优惠券
const availableCoupons = ref([])
const selectedCoupon = ref(null)
const discountAmount = computed(() => {
  if (!selectedCoupon.value) return 0
  const c = selectedCoupon.value
  const price = Number(totalPrice.value)
  if (c.discount_type === 'fixed') return Math.min(c.value, price)
  if (c.discount_type === 'percent') return +(price * (1 - c.value)).toFixed(2)
  if (c.discount_type === 'shipping') return Number(poi_info.value?.shipping_fee || 0)
  return 0
})
const finalPrice = computed(() => Math.max(0, Number(totalPrice.value) - discountAmount.value).toFixed(2))

const gender = computed(() => defineAddress.value.gender === 'male' ? '先生' : '女士')

const estimatedArrivalTime = computed(() => {
  if (!poi_info.value || !poi_info.value.delivery_time_tip) return '立即配送'
  const deliveryTimeMatch = poi_info.value.delivery_time_tip.match(/(\d+)/)
  if (!deliveryTimeMatch) return '立即配送'
  const deliveryMinutes = parseInt(deliveryTimeMatch[1], 10)
  const now = new Date()
  const arrivalTime = new Date(now.getTime() + deliveryMinutes * 60 * 1000)
  const hours = arrivalTime.getHours()
  const minutes = arrivalTime.getMinutes()
  return `${hours.toString().padStart(2, '0')}：${minutes.toString().padStart(2, '0')}分到`
})

function submit() {
  if (emptyAddress.value) {
    alertText.value = '请添加收货地址'
    showTip.value = true
    return
  }
  if (preventRepeat.value) return
  preventRepeat.value = true
  const foods = []
  const keys = Object.keys(order_data.value)
  keys.forEach((key) => {
    if (Number(key)) foods.push({ skus_id: key, num: order_data.value[key]['num'] })
  })
  submitOrder({
    restaurant_id: restaurant_id.value,
    foods,
    address_id: defineAddress.value.id,
    ...(selectedCoupon.value ? { coupon_id: selectedCoupon.value.user_coupon_id } : {})
  }).then((response) => {
    if (response.data.status === 200) {
      router.push({ path: '/pay', query: { order_id: response.data.order_id } })
    }
  })
}

watch(deliveryAddress, (address) => {
  defineAddress.value = address
})

onMounted(() => {
  const confirmOrderData = JSON.parse(localStorage.getItem('confirmOrderData'))
  restaurant_id.value = confirmOrderData.restaurant_id
  totalNum.value = confirmOrderData.foods.totalNum
  order_data.value = confirmOrderData.foods
  getAllAddress().then((response) => {
    const data = response.data
    if (data.address.length) {
      emptyAddress.value = false
      defineAddress.value = data.address[0]
    } else {
      emptyAddress.value = true
    }
  })
  getRestaurant({ restaurant_id: restaurant_id.value }).then((response) => {
    poi_info.value = response.data.data
    totalPrice.value = Number(confirmOrderData.foods.totalPrice).toFixed(2)
    // 拉取可用优惠券（传入当前订单金额用于门槛过滤）
    getAvailableCoupons({
      restaurant_id: restaurant_id.value,
      order_amount: totalPrice.value
    }).then(res => {
      if (res.data?.status === 200) availableCoupons.value = res.data.data || []
    }).catch(() => {})
  })
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

$grey: #666;
#confirm-order {
  color: #222;
  background: #f4f4f4;
  z-index: 100;
  .icon-right { font-size: 0.4rem; }
  .info-container {
    background: #fff; display: flex; align-items: center;
    padding: 0.3rem; justify-content: space-between;
    .iconfont { margin: 0 0.1rem; font-size: 0.5rem; }
  }
  .address-container { border-bottom: 1px solid $mtGrey; }
  .address-info, .arrival-info { display: flex; align-items: center; }
  .address-info {
    .address { font-size: 0.4rem; }
    .name, .gender, .phone { font-size: 0.2rem; color: $grey; }
    .phone { margin-left: 0.5rem; }
    .add-text { color: $mtYellow; font-size: 0.4rem; }
    .icon-add { font-size: 0.3rem; padding: 0.05rem; border-radius: 50%; background: $mtYellow; color: #fff; }
  }
  .arrival-info {
    .main-info { display: flex; }
    .date-type-tip { font-size: 0.4rem; font-weight: 500; }
    .select-view-time { font-size: 0.4rem; margin-left: 0.1rem; color: #368ced; }
  }
  .container {
    margin: 0.21rem 0; background: #fff; padding: 0 0.1rem 1rem;
    .head {
      @include px2rem(height, 95); display: flex; align-items: center;
      .poi-icon { display: inline-block; @include px2rem(width, 30); @include px2rem(height, 30); margin-right: 0.2rem; }
      .poi-name { flex: 1; color: #7b7b7b; font-size: 0.3rem; }
      .delivery-type-icon { @include px2rem(width, 102); @include px2rem(height, 30); }
      .poi-icon, .delivery-type-icon { background-size: 100% 100%; }
    }
    .food-list li {
      display: flex; padding: 0.2rem 0; margin-top: 0.1rem; background: #fbfbfb;
      .picture { @include px2rem(width, 110); @include px2rem(height, 110); img { width: 100%; height: 100%; } }
      .food-list-right-part {
        flex: 1;
        & > div { display: flex; justify-content: space-between; margin-left: 0.2rem; .name { font-size: 0.4rem; font-weight: 500; } .count { font-size: 0.3rem; display: inline-block; margin-top: 0.2rem; color: #9f9f9f; } .price { display: block; font-size: 0.45rem; font-weight: 500; } }
      }
    }
    .other-fee-container { margin-left: 0.26rem; li { display: flex; padding: 0.26rem 0; span:first-child { flex: 1; font-size: 0.4rem; font-weight: 500; } span:nth-child(2) { font-size: 0.35rem; } } }
    .total-price-container {
      text-align: right; margin-right: 0.2rem; padding: 0.44rem 0; border-top: 1px dashed #999;
      span:first-child { font-size: 0.45rem; font-weight: 500; color: #999; }
      .total-price { font-size: 0.45rem; font-weight: 500; strong { color: #fb4e44; } }
    }
  }
  // 优惠券区域
  .coupon-container {
    background: #fff;
    margin-bottom: 0.16rem;
    .coupon-saving-tip {
      padding: 0 0.3rem 0.2rem;
    }
  }
  .bottom {
    @include px2rem(height, 96); display: flex; position: fixed; left: 0; right: 0; bottom: 0;
    align-items: center; z-index: 101; background: #fff;
    .left {
      height: 100%; flex: 1; display: flex; align-items: center; border-top: 1px solid #e0e0e0;
      .discount-fee { flex: 1; font-size: 0.4rem; margin-left: 0.5rem; }
      .total { font-size: 0.4rem; margin-right: 0.2rem; strong { color: #fb4e44; font-size: 0.5rem; } }
    }
    .submit {
      display: inline-flex; @include px2rem(width, 210); height: 100%;
      justify-content: center; align-items: center; font-size: 0.4rem; font-weight: 500; background: $mtYellow;
    }
  }
}
</style>
