<template>
  <div class="search-foods">
    <v-head title="搜索" goBack="true"></v-head>
    <search placeholder="请输入商品 店铺名" :fun_click="fun_click"></search>
    <div class="lists">
      <ul>
        <li
          v-for="(item, index) in searchList"
          :key="index"
          @click="router.push({ path: 'store', query: { id: item.id } })">
          <span class="avatar"><van-image :src="item.pic_url" fit="cover" width="100%" height="100%" /></span>
          <span class="name" v-html="high_light(item.name)"></span>
          <span class="delivery-time">{{ item.delivery_time_tip }}送达</span>
          <span class="icon"><i class="iconfont">&#xe63f;</i></span>
        </li>
      </ul>
    </div>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { searchRestaurant } from '@/api/restaurant'
import search from '@/components/search.vue'

const router = useRouter()

const keyword = ref('')
const searchList = ref([])
const alertText = ref('')
const showTip = ref(false)

function fun_click(val) {
  if (!val) return
  keyword.value = val
  searchRestaurant({ keyword: val }).then((response) => {
    const res = response.data
    if (res.status === 200) {
      if (res.data.length) {
        searchList.value = res.data
      } else {
        alertText.value = '找不到该餐馆，输入汉堡试试'
        showTip.value = true
      }
    } else {
      alertText.value = res.message
      showTip.value = true
    }
  })
}

function high_light(value) {
  return value.replace(keyword.value, `<span style="color:#ffd161;">${keyword.value}</span>`)
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin";

.search-foods {
  .lists {
    ul li {
      @include px2rem(line-height, 115);
      display: flex; align-items: center;
      .avatar { @include px2rem(width, 80); @include px2rem(height, 80); margin: 0 0.5rem; border-radius: 50%; overflow: hidden; }
      .name { flex: 1; font-size: 0.4rem; }
      .delivery-time { @include px2rem(width, 125); font-size: 0.2rem; }
    }
  }
}
</style>
