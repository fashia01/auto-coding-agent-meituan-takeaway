<template>
  <!-- 当前选中券摘要行（van-coupon-cell 样式） -->
  <van-cell
    class="coupon-cell"
    title="优惠券"
    :value="cellValue"
    :value-class="selectedCoupon ? 'coupon-cell--selected' : 'coupon-cell--none'"
    is-link
    @click="show = true"
  />

  <!-- 半屏弹窗 -->
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ height: '70%' }"
  >
    <div class="coupon-panel">
      <div class="coupon-panel__header">
        <span class="coupon-panel__title">选择优惠券</span>
        <van-icon name="cross" class="coupon-panel__close" @click="show = false" />
      </div>

      <!-- 不使用优惠券 -->
      <van-cell
        title="不使用优惠券"
        :class="['no-coupon-item', { 'no-coupon-item--active': !selectedCoupon }]"
        @click="handleSelect(null)"
      >
        <template #right-icon>
          <van-icon v-if="!selectedCoupon" name="success" color="#ffd161" />
        </template>
      </van-cell>

      <van-divider />

      <!-- 券列表 -->
      <div class="coupon-list" v-if="coupons.length">
        <div
          v-for="coupon in coupons"
          :key="coupon.user_coupon_id"
          :class="['coupon-item', { 'coupon-item--active': selectedCoupon?.user_coupon_id === coupon.user_coupon_id }]"
          @click="handleSelect(coupon)"
        >
          <!-- 左侧金额区 -->
          <div class="coupon-item__left">
            <span class="coupon-amount">
              <template v-if="coupon.discount_type === 'fixed'">
                <span class="unit">￥</span>{{ coupon.value }}
              </template>
              <template v-else-if="coupon.discount_type === 'percent'">
                {{ Math.round(coupon.value * 10) }}<span class="unit">折</span>
              </template>
              <template v-else>
                免配<span class="unit">送费</span>
              </template>
            </span>
            <span class="coupon-threshold" v-if="coupon.threshold > 0">满{{ coupon.threshold }}元可用</span>
            <span class="coupon-threshold" v-else>无门槛</span>
          </div>
          <!-- 右侧信息区 -->
          <div class="coupon-item__right">
            <div class="coupon-name-row">
              <span class="coupon-name">{{ coupon.name }}</span>
              <van-tag v-if="coupon === coupons[0]" type="danger" size="small">推荐</van-tag>
            </div>
            <span class="coupon-expire">{{ formatExpire(coupon.expire_at) }} 到期</span>
            <span class="coupon-saving">可省 ￥{{ coupon.saving?.toFixed(2) || '?' }}</span>
          </div>
          <!-- 已选标记 -->
          <van-icon
            v-if="selectedCoupon?.user_coupon_id === coupon.user_coupon_id"
            name="success"
            color="#ffd161"
            class="coupon-item__check"
          />
        </div>
      </div>
      <van-empty v-else description="暂无可用优惠券" />
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  coupons: { type: Array, default: () => [] },
  modelValue: { type: Object, default: null }, // 当前选中的券对象
})

const emit = defineEmits(['update:modelValue', 'select'])

const show = ref(false)

const selectedCoupon = computed(() => props.modelValue)

const cellValue = computed(() => {
  if (!selectedCoupon.value) return '暂不使用'
  const c = selectedCoupon.value
  if (c.discount_type === 'fixed') return `-￥${c.value}`
  if (c.discount_type === 'percent') return `${Math.round(c.value * 10)}折`
  return '免配送费'
})

function handleSelect(coupon) {
  emit('update:modelValue', coupon)
  emit('select', coupon)
  show.value = false
}

function formatExpire(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d)) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.coupon-cell {
  :deep(.van-cell__value) {
    &.coupon-cell--selected { color: #f44; font-weight: bold; }
    &.coupon-cell--none { color: #999; }
  }
}

.coupon-panel {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__header {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 0.3rem 0;
    border-bottom: 1px solid #f5f5f5;
  }

  &__title {
    font-size: 0.36rem;
    font-weight: bold;
  }

  &__close {
    position: absolute;
    right: 0.3rem;
    font-size: 0.4rem;
    color: #999;
  }
}

.no-coupon-item {
  &--active { background: #fffbef; }
}

.coupon-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.1rem 0.3rem;
}

.coupon-item {
  display: flex;
  align-items: center;
  border: 1px solid #eee;
  border-radius: 0.16rem;
  margin-bottom: 0.2rem;
  overflow: hidden;
  position: relative;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);

  &--active {
    border-color: #ffd161;
    background: #fffbef;
  }

  &__left {
    width: 1.8rem;
    background: linear-gradient(135deg, #ff6b35, #f44);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.3rem 0.1rem;
    flex-shrink: 0;
    align-self: stretch;

    .coupon-amount {
      font-size: 0.52rem;
      font-weight: bold;
      line-height: 1;
      .unit { font-size: 0.26rem; }
    }
    .coupon-threshold {
      font-size: 0.22rem;
      opacity: 0.85;
      margin-top: 0.08rem;
      text-align: center;
    }
  }

  &__right {
    flex: 1;
    padding: 0.2rem 0.24rem;
    display: flex;
    flex-direction: column;
    gap: 0.06rem;

    .coupon-name-row {
      display: flex;
      align-items: center;
      gap: 0.1rem;
    }
    .coupon-name { font-size: 0.3rem; font-weight: bold; color: #333; }
    .coupon-expire { font-size: 0.24rem; color: #999; }
    .coupon-saving { font-size: 0.26rem; color: #f44; font-weight: bold; }
  }

  &__check {
    position: absolute;
    right: 0.2rem;
    bottom: 0.2rem;
    font-size: 0.4rem;
  }
}
</style>
