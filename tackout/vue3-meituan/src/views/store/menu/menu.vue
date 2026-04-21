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
                @plus="addFoodToCart(spus)"
                @minus="reduceFoodFromCart(spus)"
              />
            </section>
          </article>
        </section>
      </article>
    </div>
    <Bottom v-if="getInfoReady"></Bottom>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore, useRestaurantStore } from '@/stores'
import { getFoods } from '@/api/restaurant'
import Bottom from './bottom.vue'

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

function addFoodToCart(spus) {
  const restaurant_id = route.query.id
  const poi = restaurantStore.poi_info
  cartStore.addCart({
    restaurant_id,
    restaurant_name: poi.name,
    pic_url: poi.pic_url,
    food_id: spus.skus[0].id,
    price: spus.skus[0].price,
    name: spus.name,
    foods_pic: spus.pic_url
  })
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
