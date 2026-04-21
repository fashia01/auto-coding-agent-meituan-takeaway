<template>
  <nav>
    <van-swipe :autoplay="0" :show-indicators="false">
      <van-swipe-item
        class="lists"
        v-for="(item, index) in categoryListSort"
        :key="index">
        <router-link
          class="type"
          v-for="foodList in item"
          :to="{ path: '/category', query: { type: foodList.name } }"
          :key="foodList.id">
          <div class="category-img">
            <van-image :src="foodList.url" fit="cover" />
          </div>
          <span class="category-name">{{ foodList.name }}</span>
        </router-link>
      </van-swipe-item>
    </van-swipe>
  </nav>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const categoryList = [
  { id: 1, name: '美食', url: 'http://p1.meituan.net/jungle/bd3ea637aeaa2fb6120b6938b5e468a13442.png', type: 'food' },
  { id: 2, name: '美团超市', url: 'http://p0.meituan.net/94.0.100/jungle/6b93ee96be3df7cf2bb6e661280b047d3975.png', type: 'supermarket' },
  { id: 3, name: '生鲜果蔬', url: 'http://p0.meituan.net/94.0.100/jungle/f33ed552c52b4466b6308a2c14dbc62d4882.png', type: 'fruit' },
  { id: 4, name: '下午茶', url: 'http://p0.meituan.net/94.0.100/jungle/af6cf63a5dfeb3557bf3099b03002ec34124.png', type: 'tea' },
  { id: 5, name: '正餐优选', url: 'http://p1.meituan.net/94.0.100/jungle/1543bbcb048218424e2420a6934e17b24236.png', type: 'dinner' },
  { id: 6, name: '汉堡披萨', url: 'http://p1.meituan.net/94.0.100/jungle/0e63b86b4ff14d214c1999a979fd21d14273.png', type: 'pizza' },
  { id: 7, name: '跑腿代购', url: 'http://p1.meituan.net/94.0.100/jungle/b40b7d72233f7a76dd9d97af40b4b8975414.png', type: 'buyOnSomebody' },
  { id: 8, name: '快餐简餐', url: 'http://p0.meituan.net/94.0.100/jungle/deeea00bb23e4fae31ea154678c7a8003838.png', type: 'fastFood' },
  { id: 9, name: '地方菜', url: 'http://p1.meituan.net/94.0.100/jungle/b6033c2f9aa26cdf37ea24fb1346d2dc4690.png', type: 'localDish' },
  { id: 10, name: '炸鸡美食', url: 'http://p0.meituan.net/94.0.100/jungle/0ce9a33a4accc536ac9e2d8d91951c924673.png', type: 'chicken' },
  { id: 11, name: '免配送费', url: 'http://p0.meituan.net/94.0.100/jungle/f5ef975cae40ecc1a21dae61f44575d59129.png', type: 'freeDeliver' }
]

const categoryListSort = ref([])

onMounted(() => {
  const resArr = [...categoryList]
  for (let i = 0, j = 0; i < categoryList.length; i += 8, j++) {
    categoryListSort.value[j] = resArr.splice(0, 8)
  }
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin";

nav {
  padding-top: 0.3rem;
  @include px2rem(height, 370);
  .lists {
    height: 100%;
  }
  .type {
    width: 25%;
    text-align: center;
    @include px2rem(height, 140);
    margin: 0.2rem 0;
    display: inline-flex;
    flex-direction: column;
    .category-img {
      margin: 0 auto;
      @include px2rem(width, 100);
      @include px2rem(height, 95);
    }
  }
}

.lists {
  width: 100vw;
  height: 100px;
  display: inline-block;
  vertical-align: top;
  .category-img {
    img {
      width: 70%;
      height: 70%;
      margin-bottom: 0.3rem;
    }
  }
  .category-name {
    display: inline-block;
    margin: 0.2rem 0;
    font-size: 0.3rem;
  }
}
</style>
