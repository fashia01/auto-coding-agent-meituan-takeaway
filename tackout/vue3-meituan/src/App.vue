<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="keepAliveRoutes">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup>
const keepAliveRoutes = ['Index', 'Home']
</script>

<style>
/* reset */
body {
  margin: 0;
  padding: 0;
}
#app {
  min-height: 100vh;
}
</style>
