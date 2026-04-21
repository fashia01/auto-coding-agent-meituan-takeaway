<template>
  <van-tabbar v-model="active" active-color="#ffd161" inactive-color="#999">
    <van-tabbar-item name="index" icon="wap-home-o" to="/index">首页</van-tabbar-item>
    <van-tabbar-item name="ai_chat" to="/ai_chat">
      <template #icon="{ active }">
        <span :style="{ fontSize: '22px', lineHeight: 1 }">{{ active ? '🤖' : '🤖' }}</span>
      </template>
      AI推荐
    </van-tabbar-item>
    <van-tabbar-item name="order" icon="orders-o" to="/order">订单</van-tabbar-item>
    <van-tabbar-item name="home" icon="contact-o" to="/home">我的</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = ref('index')

watch(
  () => route.path,
  (path) => {
    const name = path.slice(1).split('/')[0]
    if (['index', 'order', 'home', 'ai_chat'].includes(name)) {
      active.value = name
    }
  },
  { immediate: true }
)
</script>
