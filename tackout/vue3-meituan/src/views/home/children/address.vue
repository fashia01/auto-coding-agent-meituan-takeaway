<template>
  <div id="address">
    <v-head title="我的收货地址" goBack="true"></v-head>
    <nav>
      <span>我的收货地址</span>
      <span v-show="!status" @click="managerAddress()">管理</span>
      <span v-show="status" @click="finish()">完成</span>
    </nav>
    <div class="container">
      <ul>
        <li v-for="(item, index) in addressLists" :key="item.id">
          <div>
            <p>{{ item.address }} {{ item.house_number }}</p>
            <span class="name">{{ item.name }}</span>
            <span class="sex">{{ item.gender === 'female' ? '女士' : '先生' }}</span>
            <span class="phone">{{ item.phone }}</span>
          </div>
          <i class="iconfont delete" v-show="status" @click="deleteAddr(item.id, index)">&#xe615;</i>
        </li>
      </ul>
    </div>
    <div class="add" @click="router.push({ path: '/add_address' })">
      <i class="iconfont icon">&#xe606;</i>
      <span>新增收获地址</span>
    </div>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAllAddress, deleteAddress } from '@/api/user'

const route = useRoute()
const router = useRouter()

const addressLists = ref([])
const selectAddressId = ref('')
const status = ref(0)

function loadAddresses() {
  addressLists.value = []
  getAllAddress().then((response) => {
    addressLists.value = response.data.address || []
    if (addressLists.value.length > 0) {
      selectAddressId.value = addressLists.value[0].id
    }
  })
}

function managerAddress() { status.value = 1 }
function finish() { status.value = 0 }

function deleteAddr(id, index) {
  deleteAddress({ address_id: id }).then((response) => {
    if (response.data.status === 200) loadAddresses()
  })
}

onMounted(() => { loadAddresses() })
onActivated(() => { loadAddresses() })
watch(route, () => { loadAddresses() })
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../../style/mixin";

$grey: #999;
#address {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 202; background: #f4f4f4;
  nav {
    display: flex; padding: 0.3rem 0; background: #fff;
    span { font-size: 0.4rem; margin-right: 0.2rem; font-weight: 500; }
    span:first-child { flex: 1; font-weight: normal; color: $grey; margin-left: 0.2rem; }
  }
  .container {
    margin-top: 0.2rem;
    ul li {
      display: flex; align-items: center; position: relative; padding: 0.2rem; background: #fff;
      div { flex: 1; p { font-size: 0.4rem; font-weight: 600; margin: 0.1rem 0; } span { color: #848484; font-size: 0.3rem; &:nth-of-type(2) { margin: 0 0.2rem 0 0.1rem; } } }
      .delete { font-size: 0.6rem; color: $mtYellow; }
    }
  }
  .add {
    width: 100%; position: fixed; bottom: 50px; text-align: center; @include px2rem(line-height, 100);
    border-top: 1px solid $mtGrey; border-bottom: 1px solid $mtGrey; background: #fff; color: #333;
    .icon { font-size: 0.6rem; color: $mtYellow; margin: 0 0.1rem; }
    span { font-size: 0.5rem; font-weight: 400; }
  }
}
</style>
