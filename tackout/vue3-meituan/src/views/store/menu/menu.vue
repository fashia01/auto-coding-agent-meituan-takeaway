<template>
  <div id="menu">
    <div class="left">
      <ul>
        <li
          v-for="(category, index) in foodsData"
          :key="category.id"
          :class="{ 'activity-menu': index === menuIndex }"
          @click="scrollToCategory(index)">
          {{ category.name }}
        </li>
      </ul>
    </div>
    <div class="right" ref="rightRef" @scroll="onRightScroll">
      <article ref="categorysRef">
        <section v-for="(category, catIndex) in foodsData" :key="category.id" :ref="el => { if (el) sectionRefs[catIndex] = el }">
          <h2>{{ category.name }}</h2>
          <article>
            <section v-for="spus in category.spus" :key="spus.id">
              <div class="img">
                <van-image :src="spus.pic_url" fit="cover" lazy-load width="100%" height="100%" />
              </div>
              <div class="info">
                <div class="name">{{ spus.name }}</div>
                <div class="sell-num">月售 {{ spus.month_saled_content }}</div>
                <span class="price">￥{{ spus.skus[0].price }}</span>
              </div>
              <food-selector
                v-model="foodCount[spus.skus[0].id]"
                @plus="openSpecModal(spus)"
                @minus="reduceFoodFromCart(spus)"
              />
            </section>
          </article>
        </section>
      </article>
    </div>
    <Bottom v-if="getInfoReady"></Bottom>

    <!-- 规格选择弹窗 -->
    <FoodSpecModal
      v-model:show="specModalShow"
      :food="specModalFood"
      @confirm="onSpecConfirm"
      @close="specModalShow = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { showDialog } from 'vant'
import { useCartStore, useRestaurantStore } from '@/stores'
import { getFoods } from '@/api/restaurant'
import Bottom from './bottom.vue'
import FoodSpecModal from '@/components/FoodSpecModal.vue'

const route = useRoute()
const cartStore = useCartStore()
const restaurantStore = useRestaurantStore()

const foodsData = ref([])
const getInfoReady = ref(false)
const menuIndex = ref(0)
const rightRef = ref(null)
const categorysRef = ref(null)
const sectionRefs = reactive([])
const categoryPositions = ref([])
const foodCount = reactive({})

// 规格弹窗状态
const specModalShow = ref(false)
const specModalFood = ref({})

// 点击 + 号时打开规格弹窗
function openSpecModal(spus) {
  specModalFood.value = spus
  specModalShow.value = true
}

// 弹窗确认：将选择的规格+数量加入购物车，处理跨店保护
async function onSpecConfirm({ sku, num }) {
  const restaurant_id = route.query.id
  const poi = restaurantStore.poi_info

  const addItem = () => {
    for (let i = 0; i < num; i++) {
      cartStore.addCart({
        restaurant_id,
        restaurant_name: poi.name,
        pic_url: poi.pic_url,
        food_id: sku.id,
        price: sku.price,
        name: specModalFood.value.name,
        foods_pic: specModalFood.value.pic_url,
        spec: sku.spec || sku.description || ''
      })
    }
    foodCount[sku.id] = (foodCount[sku.id] || 0) + num
  }

  try {
    addItem()
  } catch (err) {
    if (err.message === 'CROSS_STORE') {
      // 捕获跨店错误，弹出确认框
      try {
        await showDialog({
          title: '替换购物车',
          message: `您的购物车中已有"${err.oldRestaurantName}"的菜品，是否清空并加入"${err.newRestaurantName}"的菜品？`,
          confirmButtonText: '清空并加入',
          cancelButtonText: '取消',
          showCancelButton: true,
        })
        // 用户确认：清空旧购物车再添加
        cartStore.emptyCart({ restaurant_id: err.oldRestaurantId })
        addItem()
      } catch {
        // 用户取消，不做任何操作
      }
    }
  }
}

function reduceFoodFromCart(spus) {
  const restaurant_id = route.query.id
  cartStore.reduceCart({
    restaurant_id,
    food_id: spus.skus[0].id
  })
}

function scrollToCategory(index) {
  menuIndex.value = index
  if (sectionRefs[index]) {
    sectionRefs[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onRightScroll() {
  if (!rightRef.value) return
  const scrollTop = rightRef.value.scrollTop
  for (let i = 0; i < categoryPositions.value.length; i++) {
    const curr = categoryPositions.value[i]
    const next = categoryPositions.value[i + 1]
    if (scrollTop >= curr && (next === undefined || scrollTop < next)) {
      menuIndex.value = i
      break
    }
  }
}

onMounted(() => {
  const restaurant_id = route.query.id
  getFoods({ restaurant_id }).then((response) => {
    foodsData.value = response.data.data
    getInfoReady.value = true
    nextTick(() => {
      categoryPositions.value = sectionRefs.map(el => el ? el.offsetTop : 0)
    })
  })
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin.scss";

#menu {
  display: flex;
  flex: 1;
  padding-bottom: 1.368rem;
  overflow: hidden;

  .left {
    @include px2rem(width, 140);
    background: rgb(244, 244, 244);
    overflow-y: auto;
    ul li {
      display: flex;
      @include px2rem(height, 100);
      padding: 0 0.2rem;
      align-items: center;
      font-size: 0.3rem;
      @include px2rem(line-height, 40);
      border-bottom: 1px dashed $mtGrey;
      &.activity-menu { background: #fff; }
    }
  }

  .right {
    position: relative;
    flex: 1;
    overflow-y: auto;
    article > section {
      padding-top: 0.2rem;
      h2 {
        font-size: 0.4rem;
        font-weight: bold;
        margin: 0 0.2rem;
        padding-left: 0.2rem;
        border-left: 3px solid $mtYellow;
      }
      article section {
        display: flex;
        position: relative;
        margin: 0 0.5rem;
        padding: 0.2rem 0;
        border-bottom: 1px solid $mtGrey;
        .img {
          @include px2rem(width, 122);
          @include px2rem(height, 126);
          margin-right: 0.2rem;
        }
        .info {
          flex: 1;
          vertical-align: top;
          .name, .price { font-weight: bold; }
          .name { font-size: 0.3rem; }
          .sell-num { font-size: 0.3rem; margin: 0.2rem 0; }
          .price { color: rgb(251, 79, 69); font-size: 0.4rem; }
        }
      }
    }
  }
}
</style>
