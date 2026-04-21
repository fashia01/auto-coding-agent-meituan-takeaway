import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'

// Vant 样式（手动引入基础样式，组件按需自动引入）
import 'vant/lib/index.css'

// Vant LazyLoad 插件（van-image lazy-load 属性依赖此插件）
import { Lazyload } from 'vant'

// 品牌主题 CSS 变量
import './styles/var.css'

// 全局公共样式（包含 iconfont 字体定义）
import './style/common.scss'

import App from './App.vue'

// 全局注册公共组件
import AppHead from '@/components/AppHead.vue'
import AppBottom from '@/components/AppBottom.vue'
import StarRating from '@/components/StarRating.vue'
import FoodSelector from '@/components/FoodSelector.vue'
import AlertTip from '@/components/AlertTip.vue'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(Lazyload, { lazyComponent: true })

// 全局组件（保持原有组件名，兼容迁移页面）
app.component('v-head', AppHead)
app.component('v-bottom', AppBottom)
app.component('v-star', StarRating)
app.component('alert-tip', AlertTip)
app.component('food-selector', FoodSelector)

app.mount('#app')
