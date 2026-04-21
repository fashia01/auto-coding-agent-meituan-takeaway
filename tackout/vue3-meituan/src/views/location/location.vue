<template>
  <div class="location">
    <v-head goBack="true" title="选择收货地址"></v-head>
    <search placeholder="请输入收货地址" :fun_click="fun_click"></search>
    <div class="location-now" v-if="fromIndex && !suggestionLists.length" @click="locationNow">
      <i class="iconfont">&#xe793;</i>
      <span>点击定位当前位置</span>
    </div>
    <div class="lists" v-else>
      <ul>
        <li v-for="item in suggestionLists" :key="item.id" @click="selectAddress(item)">
          <h3>{{ item.title }}</h3>
          <span>{{ item.address }}</span>
        </li>
      </ul>
    </div>
    <alert-tip :text="alertText" v-model:showTip="showTip" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAddressStore } from '@/stores'
import { suggestion } from '@/api/location'
import search from '@/components/search.vue'

const route = useRoute()
const router = useRouter()
const addressStore = useAddressStore()

const suggestionLists = ref([])
const fromIndex = ref(false)
const alertText = ref('')
const showTip = ref(false)

function fun_click(val) {
  suggestion({ keyword: val }).then((response) => {
    suggestionLists.value = response.data.data.data
  })
}

function locationNow() {
  addressStore.clearAddress()
  addressStore.fetchLocation()
  router.push('/index')
}

function selectAddress(item) {
  if (fromIndex.value) {
    addressStore.clearAddress()
    addressStore.recordAddress({ address: item.title, ...item.location })
    router.push('/index')
  } else {
    addressStore.recodeDeliveryAddress(item)
    router.go(-1)
  }
}

onMounted(() => {
  fromIndex.value = !!route.query.fromIndex
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

.location {
  position: fixed; left: 0; right: 0; top: 0; bottom: 0;
  overflow-y: auto; background: rgb(244, 244, 244);
  .location-now {
    @include px2rem(height, 125); background: #fff; margin-top: 0.3rem; text-align: center;
    .iconfont { display: inline-block; font-size: 0.4rem; margin-right: 8px; color: $mtYellow; }
    span { font-size: 0.4rem; font-weight: 500; @include px2rem(line-height, 125); }
  }
  .lists ul li {
    border-bottom: 1px solid rgb(231, 231, 231); @include px2rem(height, 125);
    background: #fff; font-size: 0.34rem; padding-left: 0.2rem;
    h3 { margin-bottom: 0.2rem; padding-top: 0.2rem; }
    span { color: rgb(163, 163, 163); }
  }
}
</style>
