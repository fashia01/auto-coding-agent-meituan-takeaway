import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/index'
  },
  {
    path: '/index',
    name: '首页',
    component: () => import('@/views/Index/Index.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/category',
    name: '分类',
    component: () => import('@/views/category/category.vue')
  },
  {
    path: '/order',
    name: '我的订单',
    component: () => import('@/views/order/order.vue'),
    children: [
      {
        path: 'comment',
        name: '作评价',
        component: () => import('@/views/order/comment.vue')
      }
    ]
  },
  {
    path: '/search',
    name: '搜索商家',
    component: () => import('@/views/search/search.vue')
  },
  {
    path: '/location',
    name: '定位',
    component: () => import('@/views/location/location.vue')
  },
  {
    path: '/add_address',
    name: '添加地址',
    component: () => import('@/views/confirm_order/children/children/add_address.vue'),
    children: [
      {
        path: 'location',
        name: '地址定位',
        component: () => import('@/views/location/location.vue')
      }
    ]
  },
  {
    path: '/home',
    name: '我的',
    component: () => import('@/views/home/home.vue'),
    children: [
      {
        path: 'address',
        name: '我的收货地址',
        meta: { keepAlive: false },
        component: () => import('@/views/home/children/address.vue')
      },
      {
        path: 'thank',
        name: '答谢记录',
        component: () => import('@/views/home/children/thank_record.vue')
      },
      {
        path: 'friend',
        name: '我的好友',
        component: () => import('@/views/home/children/friend.vue')
      }
    ]
  },
  {
    path: '/my_comment',
    name: '我的评论',
    component: () => import('@/views/home/children/comment.vue')
  },
  {
    path: '/my_footprint',
    name: '我的足迹',
    component: () => import('@/views/home/children/footprint.vue')
  },
  {
    path: '/my_collection',
    name: '我的收藏',
    component: () => import('@/views/home/children/collection.vue')
  },
  {
    path: '/make_comment',
    name: '评价订单',
    component: () => import('@/views/order/comment.vue')
  },
  {
    path: '/login',
    name: '登录',
    component: () => import('@/views/login/login.vue')
  },
  {
    path: '/confirm_order',
    name: '确认订单',
    component: () => import('@/views/confirm_order/confirm_order.vue'),
    children: [{
      path: 'address',
      name: '订单收货地址',
      component: () => import('@/views/confirm_order/children/address.vue')
    }]
  },
  {
    path: '/store',
    component: () => import('@/views/store/store.vue'),
    children: [
      {
        path: 'menu',
        name: '菜单',
        component: () => import('@/views/store/menu/menu.vue')
      },
      {
        path: 'comment',
        name: '评论',
        component: () => import('@/views/store/comment/comment.vue')
      },
      {
        path: 'seller',
        name: '商家信息中心',
        component: () => import('@/views/store/seller/seller.vue')
      },
      {
        path: '',
        redirect: '/store/menu'
      }
    ]
  },
  {
    path: '/cart',
    name: '购物车',
    component: () => import('@/views/cart/cart.vue')
  },
  {
    path: '/pay',
    name: '支付',
    component: () => import('@/views/pay/pay.vue')
  },
  {
    path: '/order_detail',
    name: '订单详情',
    component: () => import('@/views/order/order_detail.vue')
  },
  {
    path: '/ai_chat',
    name: 'AI智能推荐',
    component: () => import('@/views/ai_chat/ai_chat.vue')
  },
  {
    path: '/error',
    name: '找不到该页面',
    component: () => import('@/views/404/error.vue')
  },
  {
    path: '/message',
    name: '消息中心',
    component: () => import('@/views/message/message.vue')
  },
  {
    path: '/points',
    name: '我的积分',
    component: () => import('@/views/points/points.vue')
  },
  {
    path: '/share',
    name: '订单分享',
    component: () => import('@/views/share/share.vue')
  },
  {
    path: '/group_order',
    name: '拼单',
    component: () => import('@/views/group_order/group_order.vue')
  },
  {
    path: '/admin/ai_dashboard',
    name: 'AI 决策分析',
    component: () => import('@/views/admin/ai_dashboard.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/error'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
