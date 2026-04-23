<template>
  <div id="order">
    <v-head title="我的订单" goBack="true"></v-head>

    <!-- 未登录 -->
    <div class="empty-state" v-if="!username">
      <van-icon name="user-o" size="60" color="#ddd" />
      <p class="empty-state__text">登录后查看订单记录</p>
      <van-button round type="primary" class="empty-state__btn" to="/login">
        登录 / 注册
      </van-button>
    </div>

    <!-- 无订单 -->
    <div class="empty-state" v-else-if="noOrder">
      <van-icon name="orders-o" size="60" color="#ddd" />
      <p class="empty-state__text">暂无订单，去逛逛吧</p>
      <van-button round type="primary" class="empty-state__btn" to="/index">
        去点餐
      </van-button>
    </div>

    <!-- 订单列表 -->
    <van-pull-refresh v-else v-model="refreshing" @refresh="onRefresh">
      <div class="order-list">
        <div
          v-for="item in ordersList"
          :key="item.id"
          class="order-card"
          @click="goDetail(item.id)"
        >
          <!-- 卡片头部：餐馆信息 + 状态 -->
          <div class="order-card__header">
            <div class="order-card__restaurant">
              <van-image
                :src="item.restaurant.pic_url"
                round
                fit="cover"
                class="order-card__logo"
                :error-icon="'shop-o'"
              />
              <span class="order-card__name">{{ item.restaurant.name }}</span>
              <van-icon name="arrow" color="#ccc" size="14" />
            </div>
            <van-tag
              :type="statusTag(item.status).type"
              class="order-card__status"
            >
              {{ statusTag(item.status).text }}
            </van-tag>
          </div>

          <!-- 分割线 -->
          <van-divider class="order-card__divider" />

          <!-- 菜品列表（最多展示3条） -->
          <div class="order-card__foods">
            <div
              v-for="(food, idx) in item.foods.slice(0, 3)"
              :key="food._id || idx"
              class="food-row"
            >
              <div class="food-row__img-wrap">
                <van-image
                  :src="food.foods_pic || food.pic_url"
                  fit="cover"
                  width="48"
                  height="48"
                  radius="6"
                  :error-icon="'photo-o'"
                />
              </div>
              <span class="food-row__name">{{ food.name }}</span>
              <span class="food-row__num">×{{ food.num }}</span>
            </div>
            <div v-if="item.foods.length > 3" class="food-row__more">
              还有 {{ item.foods.length - 3 }} 件商品
            </div>
          </div>

          <!-- 价格 & 件数 -->
          <div class="order-card__price-row">
            <span class="order-card__count">共 {{ item.foods.length }} 件</span>
            <span class="order-card__price-label">实付</span>
            <span class="order-card__price">￥{{ item.total_price }}</span>
          </div>

          <!-- 操作按钮 -->
          <div class="order-card__actions" @click.stop>
            <!-- delivered：快速再来一单（自动填充菜品到确认下单页） -->
            <van-button
              v-if="item.status === 'delivered'"
              size="small"
              round
              type="primary"
              class="action-btn action-btn--reorder"
              @click="reorder(item)"
            >
              再来一单
            </van-button>
            <!-- 其他状态：跳转餐馆菜单 -->
            <van-button
              v-else
              size="small"
              round
              plain
              class="action-btn"
              :to="'/store/menu?id=' + item.restaurant.id"
            >
              再来一单
            </van-button>
            <van-button
              v-if="!item.has_comment && item.status === 'DONE'"
              size="small"
              round
              type="primary"
              class="action-btn"
              :to="{ path: '/order/comment', query: { order_id: item.id } }"
            >
              去评价
            </van-button>
            <van-button
              size="small"
              round
              plain
              class="action-btn"
              :to="'/order_detail?id=' + item.id"
            >
              查看详情
            </van-button>
          </div>
        </div>
      </div>
    </van-pull-refresh>

    <v-bottom></v-bottom>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { orders } from '@/api/order'
import { getInfo } from '@/utils/auth'

const router = useRouter()
const username = ref(null)
const ordersList = ref([])
const noOrder = ref(false)
const refreshing = ref(false)

function statusTag(status) {
  const map = {
    'DONE':       { text: '已完成',   type: 'success' },
    'delivered':  { text: '已送达',   type: 'success' },
    'delivering': { text: '配送中',   type: 'primary' },
    'preparing':  { text: '备餐中',   type: 'warning' },
    'accepted':   { text: '商家接单', type: 'warning' },
    'paid':       { text: '已支付',   type: 'primary' },
    'cancelled':  { text: '已取消',   type: 'danger'  },
    'pending_payment': { text: '待支付', type: 'danger' },
  }
  return map[status] || { text: '已完成', type: 'success' }
}

function goDetail(id) {
  router.push('/order_detail?id=' + id)
}

// 再来一单：从历史订单构建 confirmOrderData 写入 localStorage，跳转到确认下单页
function reorder(item) {
  try {
    if (!item.foods || !item.foods.length) {
      showToast({ message: '订单数据异常', position: 'bottom' })
      return
    }

    // 按 food_id（sku_id）构建 foods 对象，格式与 cart 一致
    const foods = {
      totalPrice: 0,
      totalNum: 0,
      restaurant_name: item.restaurant?.name || '',
      pic_url: item.restaurant?.pic_url || ''
    }

    item.foods.forEach(f => {
      const foodId = f.sku_id || f.foods_id || f.id
      if (!foodId) return
      const price = Number(f.price || 0)
      const num = Number(f.num || 1)
      foods[foodId] = {
        id: foodId,
        name: f.name,
        price,
        foods_pic: f.foods_pic || f.pic_url || '',
        spec: f.spec || '',
        num
      }
      foods.totalPrice = +((foods.totalPrice || 0) + price * num).toFixed(2)
      foods.totalNum = (foods.totalNum || 0) + num
    })

    const confirmOrderData = {
      restaurant_id: item.restaurant_id,
      foods
    }

    localStorage.setItem('confirmOrderData', JSON.stringify(confirmOrderData))
    router.push({ path: '/confirm_order' })
  } catch (e) {
    showToast({ message: '再来一单失败，请重试', position: 'bottom' })
  }
}

function fetchOrders() {
  return orders().then((response) => {
    if (response.data.status === 200) {
      ordersList.value = response.data.data
      noOrder.value = !ordersList.value.length
    }
  })
}

function onRefresh() {
  fetchOrders().finally(() => { refreshing.value = false })
}

onMounted(() => {
  username.value = getInfo()
  if (username.value) fetchOrders()
})
</script>

<style lang="scss" scoped>
@import "../../style/mixin.scss";

#order {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 1.4rem;
}

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 3rem;
  gap: 0.4rem;

  &__text {
    font-size: 0.38rem;
    color: #999;
    margin: 0.2rem 0 0.4rem;
  }

  &__btn {
    @include px2rem(width, 380);
    font-size: 0.38rem;
  }
}

/* ── 订单列表 ── */
.order-list {
  padding: 0.3rem 0.3rem 0;
}

/* ── 订单卡片 ── */
.order-card {
  background: #fff;
  border-radius: 0.24rem;
  margin-bottom: 0.3rem;
  padding: 0.36rem 0.36rem 0.28rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  /* 头部：餐馆 + 状态 */
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__restaurant {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
  }

  &__logo {
    @include px2rem(width, 64);
    @include px2rem(height, 64);
    flex-shrink: 0;
    border: 1px solid #f0f0f0;
  }

  &__name {
    font-size: 0.42rem;
    font-weight: 600;
    color: #222;
    flex: 1;
    @include ellipsis;
  }

  &__status {
    flex-shrink: 0;
    font-size: 0.28rem !important;
  }

  &__divider {
    margin: 0.28rem 0 !important;
    border-color: #f5f5f5 !important;
  }

  /* 菜品列表 */
  &__foods {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  /* 价格行 */
  &__price-row {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 0.12rem;
    margin-top: 0.28rem;
    padding-top: 0.24rem;
    border-top: 1px solid #f5f5f5;
  }

  &__count {
    font-size: 0.28rem;
    color: #999;
    flex: 1;
  }

  &__price-label {
    font-size: 0.3rem;
    color: #666;
  }

  &__price {
    font-size: 0.44rem;
    font-weight: 700;
    color: #fb4e44;
  }

  /* 操作按钮区 */
  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.2rem;
    margin-top: 0.3rem;
  }
}

/* ── 菜品行 ── */
.food-row {
  display: flex;
  align-items: center;
  gap: 0.2rem;

  &__img-wrap {
    flex-shrink: 0;
    border-radius: 0.12rem;
    overflow: hidden;
    background: #f9f9f9;
  }

  &__name {
    flex: 1;
    font-size: 0.34rem;
    color: #555;
    @include ellipsis;
  }

  &__num {
    font-size: 0.3rem;
    color: #aaa;
    flex-shrink: 0;
  }

  &__more {
    font-size: 0.3rem;
    color: #aaa;
    text-align: center;
    padding: 0.1rem 0;
  }
}

/* ── 操作按钮 ── */
.action-btn {
  @include px2rem(min-width, 160);
  font-size: 0.32rem !important;
  height: 0.68rem !important;
  line-height: 0.68rem !important;

  &.van-button--plain {
    border-color: #ddd;
    color: #555;
  }

  &--reorder {
    background: #ffd161 !important;
    border-color: #ffd161 !important;
    color: #333 !important;
    font-weight: 600;
  }
}

/* Vant 覆盖：primary tag 使用美团黄 */
:deep(.van-tag--primary) {
  background: #ffd161;
  color: #333;
}
:deep(.van-button--primary) {
  background: #ffd161;
  border-color: #ffd161;
  color: #333;
}
</style>
