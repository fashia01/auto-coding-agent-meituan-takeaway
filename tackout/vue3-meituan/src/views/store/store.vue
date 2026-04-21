<template>
  <div id="store">
    <!-- skeleton loading -->
    <div class="skeleton-loading" v-if="!poi_info.name">
      <van-skeleton title :row="6" />
    </div>
    <!-- 头部商家信息 -->
    <div class="head-container">
      <v-head :title="poi_info.name" goBack="true" color="#fff" bgColor="#333" more="true"></v-head>
      <div class="store-info">
        <div class="logo">
          <van-image :src="poi_info.pic_url" fit="cover" width="100%" height="100%" />
        </div>
        <div class="deliver-info">
          <span>{{ poi_info.min_price_tip }} | {{ poi_info.shipping_fee_tip }} | {{ poi_info.delivery_time_tip }}</span>
          <p><i class="iconfont icon-broadcast">&#xe62d;</i>{{ poi_info.bulletin }}</p>
        </div>
        <div class="collect-btn" @click="toggleCollection">
          <span class="collect-icon" :class="isCollected ? 'collected' : ''">{{ isCollected ? '★' : '☆' }}</span>
          <span>{{ isCollected ? '已收藏' : '收藏' }}</span>
        </div>
      </div>
      <!-- 活动列表 -->
      <div class="actives">
        <ul :style="'transform: translateY(' + positionY % discountsLength * -0.9 + 'rem)'">
          <li v-for="(item, index) in poi_info.discounts2" :key="index">
            <i class="icon" :style="{ backgroundImage: 'url(' + item.icon_url + ')' }"></i>
            <span>{{ item.info }}</span>
          </li>
        </ul>
        <span class="active-number" @click="showStoreDetail()">{{ discountsLength }}个活动 > </span>
      </div>
    </div>
    <!-- 导航 -->
    <div class="nav">
      <router-link :to="{ path: '/store/menu', query: { id: restaurant_id } }" class="menu" active-class="active">
        <span class="active">点菜</span>
      </router-link>
      <router-link :to="{ path: '/store/comment', query: { id: restaurant_id } }" class="comment" active-class="active">
        <span>评价</span>
      </router-link>
      <router-link :to="{ path: '/store/seller', query: { id: restaurant_id } }" class="seller" active-class="active">
        <span>商家</span>
      </router-link>
    </div>
    <!-- 商家详情 -->
    <transition name="fade">
      <store-detail
        class="store-detail"
        v-show="showDetail"
        v-model:showFlag="showDetail"
        :poi_info="poi_info">
      </store-detail>
    </transition>
    <keep-alive>
      <router-view></router-view>
    </keep-alive>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useRestaurantStore } from '@/stores'
import StoreDetail from './store_detail.vue'
import { addFootprint, addCollection, deleteCollection, getCollection } from '@/api/user'

const route = useRoute()
const restaurantStore = useRestaurantStore()
const { poi_info } = storeToRefs(restaurantStore)

const showDetail = ref(false)
const restaurant_id = ref(0)
const positionY = ref(0)
const isCollected = ref(false)
const collectionList = ref([])
let timer = null

const discountsLength = computed(() => poi_info.value.discounts2 ? poi_info.value.discounts2.length : 0)

function showStoreDetail() {
  showDetail.value = true
}

function recordFootprint() {
  if (!restaurant_id.value || !poi_info.value.name) return
  const restaurantData = {
    id: poi_info.value.id,
    name: poi_info.value.name,
    pic_url: poi_info.value.pic_url,
    wm_poi_score: poi_info.value.wm_poi_score || 0,
    delivery_score: poi_info.value.delivery_score || 0
  }
  addFootprint({ restaurant_id: restaurant_id.value, restaurant: restaurantData }).catch(err => {
    console.log('记录足迹失败', err)
  })
}

function checkCollection() {
  getCollection().then((response) => {
    const res = response.data
    if (res.status === 200) {
      collectionList.value = res.data || []
      isCollected.value = collectionList.value.some(item => item.restaurant_id === restaurant_id.value)
    }
  }).catch(err => console.log('获取收藏列表失败', err))
}

function toggleCollection() {
  if (!restaurant_id.value || !poi_info.value.name) return
  const restaurantData = {
    id: poi_info.value.id,
    name: poi_info.value.name,
    pic_url: poi_info.value.pic_url,
    wm_poi_score: poi_info.value.wm_poi_score || 0,
    delivery_score: poi_info.value.delivery_score || 0,
    delivery_time_tip: poi_info.value.delivery_time_tip || '',
    shipping_fee: poi_info.value.shipping_fee || 0
  }
  if (isCollected.value) {
    deleteCollection({ restaurant_id: restaurant_id.value }).then((response) => {
      if (response.data.status === 200) isCollected.value = false
    }).catch(err => console.log('取消收藏失败', err))
  } else {
    addCollection({ restaurant_id: restaurant_id.value, restaurant: restaurantData }).then((response) => {
      if (response.data.status === 200) isCollected.value = true
    }).catch(err => console.log('添加收藏失败', err))
  }
}

watch(poi_info, (newVal) => {
  if (newVal && newVal.name) recordFootprint()
}, { deep: true })

onMounted(() => {
  restaurant_id.value = route.query.id
  restaurantStore.getRestaurant(restaurant_id.value)
  checkCollection()
  timer = setInterval(() => { positionY.value++ }, 4000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

#store {
  height: 100%;
  display: flex;
  flex-direction: column;
  .skeleton-loading {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 1001;
    padding: 1rem;
    background: #fff;
  }
  .head-container {
    background: rgb(51, 51, 51);
    .store-info {
      display: flex;
      margin-top: 0.2rem;
      padding-bottom: 0.2rem;
      border-bottom: 1px solid $mtGrey;
      position: relative;
      .collect-btn {
        position: absolute;
        right: 0.2rem;
        top: 0.2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 0.3rem;
        color: #666;
        .collect-icon {
          font-size: 0.7rem;
          color: #999;
          &.collected { color: #ff6000; }
        }
      }
      .logo {
        @include px2rem(width, 82);
        @include px2rem(height, 82);
        margin: 0 0.2rem;
      }
      .deliver-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        span, p {
          color: $mtGrey;
          font-size: 0.35rem;
          margin-top: 0.1rem;
        }
        p {
          @include px2rem(width, 500);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          .icon-broadcast { display: inline-block; font-size: 0.4rem; margin-right: 0.1rem; vertical-align: middle; }
        }
      }
    }
    .actives {
      @include px2rem(height, 70);
      @include px2rem(line-height, 70);
      overflow: hidden;
      margin: 0 0.2rem;
      position: relative;
      ul {
        transition: all 2s;
        li {
          display: flex;
          align-items: center;
          .icon { display: inline-block; @include px2rem(width, 30); @include px2rem(height, 30); background-size: cover; margin-right: 0.1rem; }
          span { font-size: 0.3rem; }
        }
      }
      span { color: $mtGrey; display: inline-block; }
      .active-number { font-size: 0.3rem; position: absolute; top: 0; right: 0; }
    }
  }
  .nav {
    display: flex;
    flex-shrink: 0;
    .menu, .seller, .comment {
      flex: 1;
      text-align: center;
      @include px2rem(line-height, 80);
      font-size: 0.4rem;
      span { display: inline-block; }
      &.active span { color: $mtYellow; margin-bottom: 0.1rem; border-bottom: 3px solid $mtYellow; }
    }
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity .4s }
.fade-enter-from, .fade-leave-active { opacity: 0 }
</style>
