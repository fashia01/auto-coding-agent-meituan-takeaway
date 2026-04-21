<template>
  <div class="wrapper">
    <div id="food-type">
      <v-head :title="type" goBack="true" bgColor="#f4f4f4"></v-head>
      <nearby-shops></nearby-shops>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAddressStore } from '@/stores'
import nearbyShops from '@/views/Index/nearby_shops.vue'

const route = useRoute()
const addressStore = useAddressStore()

const type = ref('')

onMounted(() => {
  type.value = route.query.type || '美食'
  addressStore.setLocationReady(true)
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.wrapper {
  height: 100%;
  overflow-y: auto;
}
</style>
