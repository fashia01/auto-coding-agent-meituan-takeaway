<template>
  <div id="cart">
    <v-head title="购物车" goBack="true" bgColor="#f4f4f4">
      <template #edit-cart>
        <span class="edit" @click="editStatus = true" v-if="!editStatus">编辑</span>
        <span class="edit" @click="editStatus = false" v-else>取消</span>
      </template>
    </v-head>

    <div class="empty-cart" v-if="emptyCart">
      <div class="info-container">
        <img src="../../assets/nothing.png">
        <span class="text">购物车空空如也，快去逛逛吧</span>
        <router-link class="redirect-index" to="/index"><span>去逛逛</span></router-link>
      </div>
    </div>

    <article v-for="(item, restaurant_id) in cartList" :key="restaurant_id">
      <section class="title">
        <span
          class="delete-selected selected"
          v-if="editStatus && deleteSelectFood[restaurant_id] && deleteSelectFood[restaurant_id]['allSelect'] === true"
          @click="allSelectDelete(restaurant_id, false)">
          <i class="iconfont">&#xe6da;</i>
        </span>
        <span class="select" v-else-if="editStatus" @click="allSelectDelete(restaurant_id, true)"></span>
        <span
          class="selected"
          v-if="!editStatus && selectFood[restaurant_id] && selectFood[restaurant_id]['allSelect'] === true"
          @click="allSelect(restaurant_id, false)">
          <i class="iconfont">&#xe6da;</i>
        </span>
        <span class="select" v-else-if="!editStatus" @click="allSelect(restaurant_id, true)"></span>
        <span class="restaurant-picture">
          <img :src="item.pic_url">
        </span>
        <span class="restaurant-name">{{ item.restaurant_name }}</span>
      </section>

      <van-swipe-cell v-for="(food, foodKey) in item" :key="foodKey" v-if="Number(foodKey)">
        <template #right>
          <van-button square type="danger" text="删除" @click="deleteSingleFood(restaurant_id, foodKey)" />
        </template>
        <section class="main-container">
          <div class="foods">
            <span class="selected delete-selected"
              v-if="editStatus && deleteSelectFood[restaurant_id] && deleteSelectFood[restaurant_id][foodKey] === true"
              @click="cancelSelectDelete(restaurant_id, foodKey)">
              <i class="iconfont">&#xe6da;</i>
            </span>
            <span class="select delete-select" v-else-if="editStatus" @click="selectDelete(restaurant_id, foodKey)"></span>
            <span class="selected"
              v-if="!editStatus && selectFood[restaurant_id] && selectFood[restaurant_id][foodKey] === true"
              @click="cancelSelect(restaurant_id, foodKey)">
              <i class="iconfont">&#xe6da;</i>
            </span>
            <span class="select" v-else-if="!editStatus" @click="select(restaurant_id, foodKey)"></span>
            <div class="picture-container">
              <img :src="food.foods_pic">
            </div>
            <div class="info">
              <span class="name">{{ food.name }}</span>
              <div>
                <span class="num">x{{ food.num }}</span>
                <span class="price">￥{{ food.price }}</span>
              </div>
            </div>
          </div>
        </section>
      </van-swipe-cell>

      <div class="bottom" v-show="!editStatus">
        <span class="submit"
          @click="submit(restaurant_id)"
          :class="{ active: !selectFood[restaurant_id] || !selectFood[restaurant_id]['totalPrice'] }">去结算
        </span>
        <span class="total-price">￥{{ selectFood[restaurant_id] ? selectFood[restaurant_id]['totalPrice'].toFixed(2) : '0.00' }}</span>
      </div>
    </article>

    <footer class="btn-delete" v-show="editStatus" @click="deleteCart()">
      <span>删除</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores'

const router = useRouter()
const cartStore = useCartStore()
const { cartList } = storeToRefs(cartStore)

const totalPrice = ref(0)
const selectFood = reactive({})
const deleteSelectFood = reactive({})
const editStatus = ref(false)
const emptyCart = ref(true)

function init() {
  emptyCart.value = !Object.keys(cartList.value).length
  Object.keys(cartList.value).forEach(restaurant_id => {
    selectFood[restaurant_id] = { allSelect: true, totalPrice: 0 }
    deleteSelectFood[restaurant_id] = { allSelect: false }
    const restaurant = cartList.value[restaurant_id]
    Object.keys(restaurant).forEach(data => {
      if (Number(data)) {
        deleteSelectFood[restaurant_id][data] = false
        selectFood[restaurant_id][data] = true
        selectFood[restaurant_id]['totalPrice'] += Number(restaurant[data]['price']) * Number(restaurant[data]['num'])
      }
    })
  })
}

function cancelSelect(restaurant_id, foodKey) {
  selectFood[restaurant_id][foodKey] = false
  selectFood[restaurant_id]['allSelect'] = false
  const cartFoodData = cartList.value[restaurant_id][foodKey]
  selectFood[restaurant_id]['totalPrice'] -= cartFoodData['num'] * cartFoodData['price']
}

function cancelSelectDelete(restaurant_id, foodKey) {
  deleteSelectFood[restaurant_id][foodKey] = false
  deleteSelectFood[restaurant_id]['allSelect'] = false
}

function select(restaurant_id, foodKey) {
  selectFood[restaurant_id][foodKey] = true
  const cartFoodData = cartList.value[restaurant_id][foodKey]
  selectFood[restaurant_id]['totalPrice'] += cartFoodData['num'] * cartFoodData['price']
  const newObj = { ...selectFood[restaurant_id] }
  selectFood[restaurant_id]['allSelect'] = isAllSelect(newObj, restaurant_id)
}

function selectDelete(restaurant_id, foodKey) {
  deleteSelectFood[restaurant_id][foodKey] = true
  const newObj = { ...deleteSelectFood[restaurant_id] }
  deleteSelectFood[restaurant_id]['allSelect'] = isAllSelect(newObj, restaurant_id)
}

function isAllSelect(newObj) {
  delete newObj.allSelect
  const values = Object.values(newObj)
  return !values.some(el => el === false)
}

function allSelect(restaurant_id, boolean) {
  selectFood[restaurant_id]['allSelect'] = boolean
  Object.keys(selectFood[restaurant_id]).forEach(el => {
    if (Number(el)) selectFood[restaurant_id][el] = boolean
  })
  if (boolean) {
    selectFood[restaurant_id]['totalPrice'] = 0
    const restaurant = cartList.value[restaurant_id]
    Object.keys(restaurant).forEach(el => {
      if (Number(el)) selectFood[restaurant_id]['totalPrice'] += restaurant[el]['num'] * restaurant[el]['price']
    })
  } else {
    selectFood[restaurant_id]['totalPrice'] = 0
  }
}

function allSelectDelete(restaurant_id, boolean) {
  deleteSelectFood[restaurant_id]['allSelect'] = boolean
  Object.keys(deleteSelectFood[restaurant_id]).forEach(el => {
    if (Number(el)) deleteSelectFood[restaurant_id][el] = boolean
  })
}

function submit(restaurant_id) {
  if (!selectFood[restaurant_id] || !selectFood[restaurant_id].totalPrice) return
  const restaurant = selectFood[restaurant_id]
  const foods = { totalPrice: 0, totalNum: 0 }
  Object.keys(restaurant).forEach(el => {
    if (Number(el) && restaurant[el]) {
      const food = cartList.value[restaurant_id][el]
      foods[el] = food
      foods['totalPrice'] += food.num * food.price
      foods['totalNum'] += food.num
    }
  })
  const data = { restaurant_id, foods }
  localStorage.setItem('confirmOrderData', JSON.stringify(data))
  router.push({ path: '/confirm_order' })
}

function deleteCart() {
  Object.keys(deleteSelectFood).forEach((restaurant_id) => {
    const restaurant = deleteSelectFood[restaurant_id]
    Object.keys(restaurant).forEach(food_id => {
      if (Number(food_id) && restaurant[food_id]) {
        cartStore.deleteFood({ restaurant_id, food_id })
        delete selectFood[restaurant_id][food_id]
      }
      allSelect(restaurant_id, false)
      delete restaurant[food_id]
    })
  })
  editStatus.value = false
  emptyCart.value = !Object.keys(cartList.value).length
}

function deleteSingleFood(restaurant_id, food_id) {
  cartStore.deleteFood({ restaurant_id, food_id })
  emptyCart.value = !Object.keys(cartList.value).length
}

onMounted(() => {
  init()
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin";

#cart {
  .info-container {
    text-align: center;
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    img { width: 3rem; height: 3rem; }
    .text { display: block; font-size: 0.35rem; }
    .redirect-index {
      display: flex;
      width: 3rem; height: 1rem;
      margin: 0.3rem auto;
      justify-content: center;
      align-items: center;
      background: $mtYellow;
      span { font-size: 0.3rem; }
    }
  }
  .edit { position: absolute; right: 15px; top: 2px; font-size: 0.4rem; font-weight: 600; }
  .title {
    padding: 0.2rem;
    display: flex;
    align-items: center;
    .restaurant-name { font-size: 0.4rem; vertical-align: middle; }
    .restaurant-picture { display: inline-block; margin: 0 0.2rem; img { @include px2rem(width, 42); @include px2rem(height, 42); } }
  }
  .select, .selected {
    display: inline-block;
    @include px2rem(width, 40); @include px2rem(height, 40);
    border-radius: 50%;
  }
  .select { border: 1px solid #e9e8ea; vertical-align: middle; }
  .selected { text-align: center; background: $mtYellow; @include px2rem(line-height, 35); display: inline-flex; justify-content: center; align-items: center; .iconfont { font-size: 0.5rem; } }
  .delete-selected { background: #ff4b37; }
  .main-container {
    padding: 0.05rem 0 0.05rem 0.3rem;
    .foods {
      display: flex; align-items: center; margin: 0.2rem 0;
      .picture-container { @include px2rem(width, 160); @include px2rem(height, 155); margin-left: 0.2rem; img { width: 100%; height: 100%; } }
      .info {
        flex: 1; display: flex; flex-direction: column; justify-content: space-between;
        background: #f7f7f7; padding: 0.1rem 0 0.1rem 0.3rem; @include px2rem(height, 150);
        .name { font-size: 0.4rem; font-weight: 600; }
        div { display: flex; justify-content: space-between; @include px2rem(padding-top, 50); .num { font-size: 0.4rem; } .price { font-size: 0.4rem; padding-right: 0.2rem; } }
      }
    }
  }
  .bottom {
    display: flex; align-items: center; flex-direction: row-reverse;
    padding: 0.5rem 0;
    border-top: 1px solid #e9e8ea;
    .total-price { flex: 1; text-align: right; @include px2rem(margin-right, 20); font-size: 0.5rem; color: #c75a5d; }
    .submit {
      margin-right: 0.1rem; text-align: center; font-size: 0.5rem; background: $mtYellow;
      display: inline-block; @include px2rem(width, 186); @include px2rem(line-height, 68);
      &.active { background: $mtGrey; }
    }
  }
  .btn-delete {
    position: fixed; bottom: 0; left: 0; right: 0;
    text-align: center; @include px2rem(line-height, 68); background: #c54144;
    span { color: #fff; font-size: 0.4rem; }
  }
}
</style>
