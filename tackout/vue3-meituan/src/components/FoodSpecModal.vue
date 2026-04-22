<template>
  <van-action-sheet
    v-model:show="visible"
    class="food-spec-modal"
    @cancel="emit('close')"
    @closed="emit('close')"
  >
    <div class="modal-content">
      <!-- 菜品概要 -->
      <div class="food-header">
        <van-image
          class="food-img"
          :src="food.pic_url"
          fit="cover"
          radius="8"
        />
        <div class="food-meta">
          <div class="food-name">{{ food.name }}</div>
          <div class="food-desc" v-if="food.description">{{ food.description }}</div>
          <div class="food-price">
            <span class="price-label">￥</span>
            <span class="price-value">{{ selectedSku.price }}</span>
          </div>
        </div>
      </div>

      <!-- 规格选择（仅多规格时展示） -->
      <template v-if="food.skus && food.skus.length > 1">
        <div class="section-title">规格</div>
        <van-radio-group v-model="selectedSkuId" class="sku-group">
          <van-cell-group inset>
            <van-cell
              v-for="sku in food.skus"
              :key="sku.id"
              :title="sku.spec || sku.description || '标准'"
              :label="`￥${sku.price}`"
              clickable
              @click="selectedSkuId = sku.id"
            >
              <template #right-icon>
                <van-radio :name="sku.id" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </template>

      <!-- 数量选择 -->
      <div class="section-title">数量</div>
      <div class="num-row">
        <span class="num-label">购买数量</span>
        <van-stepper
          v-model="num"
          :min="1"
          :max="99"
          button-size="28px"
          input-width="40px"
        />
      </div>

      <!-- 加入购物车按钮 -->
      <div class="btn-row">
        <van-button
          block
          round
          color="#ffc300"
          class="confirm-btn"
          @click="handleConfirm"
        >
          加入购物车 · ￥{{ totalPrice }}
        </van-button>
      </div>
    </div>
  </van-action-sheet>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCartStore } from '@/stores'

const props = defineProps({
  show: { type: Boolean, default: false },
  food: { type: Object, required: true },
  // 调用方提供：加入购物车所需的餐馆信息
  restaurantId: { type: [String, Number], default: null },
  restaurantName: { type: String, default: '' },
  restaurantPic: { type: String, default: '' },
})

const emit = defineEmits(['confirm', 'close', 'update:show'])

// 弹窗可见性（双向绑定）
const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

// 当前选中的 sku id，默认第一个
const selectedSkuId = ref(null)
watch(
  () => props.food,
  (food) => {
    if (food?.skus?.length) {
      selectedSkuId.value = food.skus[0].id
    }
  },
  { immediate: true }
)

// 当前选中的 sku 对象
const selectedSku = computed(() => {
  if (!props.food?.skus) return {}
  return props.food.skus.find(s => s.id === selectedSkuId.value) || props.food.skus[0] || {}
})

// 购买数量
const num = ref(1)
watch(() => props.show, (val) => {
  if (val) num.value = 1  // 每次打开重置数量
})

// 小计
const totalPrice = computed(() => {
  const p = parseFloat(selectedSku.value?.price || 0)
  return (p * num.value).toFixed(2)
})

const cartStore = useCartStore()

function handleConfirm() {
  emit('confirm', {
    sku: selectedSku.value,
    num: num.value
  })
  emit('update:show', false)
}
</script>

<style lang="scss" scoped>
.food-spec-modal {
  :deep(.van-action-sheet__content) {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

.modal-content {
  padding: 0 0.4rem 0.4rem;
}

.food-header {
  display: flex;
  gap: 0.3rem;
  padding: 0.4rem 0 0.3rem;

  .food-img {
    width: 1.8rem;
    height: 1.8rem;
    flex-shrink: 0;
  }

  .food-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .food-name {
      font-size: 0.36rem;
      font-weight: bold;
      color: #333;
      line-height: 1.4;
      margin-bottom: 0.1rem;
    }

    .food-desc {
      font-size: 0.26rem;
      color: #999;
      line-height: 1.3;
      margin-bottom: 0.1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .food-price {
      .price-label {
        font-size: 0.26rem;
        color: #f44;
      }
      .price-value {
        font-size: 0.44rem;
        font-weight: bold;
        color: #f44;
      }
    }
  }
}

.section-title {
  font-size: 0.3rem;
  font-weight: bold;
  color: #333;
  margin: 0.3rem 0 0.15rem;
}

.sku-group {
  :deep(.van-cell-group) {
    margin: 0;
  }
}

.num-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.15rem 0;

  .num-label {
    font-size: 0.3rem;
    color: #555;
  }
}

.btn-row {
  margin-top: 0.4rem;

  .confirm-btn {
    font-size: 0.34rem;
    font-weight: bold;
    color: #333;
    height: 0.96rem;
  }
}
</style>
