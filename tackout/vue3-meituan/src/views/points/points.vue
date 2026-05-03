<template>
  <div class="points-page">
    <v-head title="我的积分" goBack="true" />

    <!-- 余额卡片 -->
    <div class="balance-card">
      <div class="balance-top">
        <span class="level-badge">{{ account.level_icon }} {{ account.level_name }}</span>
        <span class="balance-num">{{ account.balance }}</span>
        <span class="balance-label">可用积分</span>
      </div>
      <div class="level-progress" v-if="account.next_level_name">
        <span class="progress-tip">再获得 {{ account.next_level_min - account.total_earned }} 分升级为 {{ account.next_level_name }}</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: account.progress + '%' }"></div>
        </div>
      </div>
      <div class="level-max" v-else>
        <span>🎉 已达最高等级，每单额外+15%积分加成</span>
      </div>
    </div>

    <!-- 积分商城 -->
    <div class="section-title">🛍️ 积分商城</div>
    <div class="redeem-list">
      <div v-for="opt in redeemOptions" :key="opt.sku" class="redeem-item">
        <div class="redeem-left">
          <span class="redeem-label">{{ opt.label }}</span>
          <span class="redeem-valid">{{ opt.valid_days }}天有效期</span>
        </div>
        <div class="redeem-right">
          <span class="redeem-points">{{ opt.points }} 积分</span>
          <van-button
            size="small"
            round
            :color="account.balance >= opt.points ? '#ffd161' : '#ccc'"
            :disabled="account.balance < opt.points || redeemLoading === opt.sku"
            :loading="redeemLoading === opt.sku"
            @click="handleRedeem(opt)"
          >兑换</van-button>
        </div>
      </div>
    </div>

    <!-- 积分明细 -->
    <div class="section-title">📋 积分明细</div>
    <van-list
      v-model:loading="ledgerLoading"
      :finished="ledgerFinished"
      finished-text="没有更多记录"
      @load="loadLedger"
    >
      <div v-for="item in ledger" :key="item.id" class="ledger-item">
        <div class="ledger-left">
          <span class="ledger-reason">{{ reasonLabel(item.reason) }}</span>
          <span class="ledger-time">{{ formatTime(item.created_at) }}</span>
        </div>
        <span class="ledger-delta" :class="item.delta > 0 ? 'delta-plus' : 'delta-minus'">
          {{ item.delta > 0 ? '+' : '' }}{{ item.delta }}
        </span>
      </div>
      <div v-if="!ledgerLoading && ledger.length === 0" class="ledger-empty">暂无积分记录</div>
    </van-list>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'

const API_BASE = 'http://localhost:3000'

const account = ref({
  balance: 0, total_earned: 0,
  level_name: '铜牌', level_icon: '🥉',
  next_level_name: '银牌', next_level_min: 500, progress: 0
})
const redeemOptions = ref([])
const redeemLoading = ref(null)
const ledger = ref([])
const ledgerLoading = ref(false)
const ledgerFinished = ref(false)
const ledgerPage = ref(1)

const reasonMap = { order_reward: '下单奖励', redemption: '积分兑换', deduction: '积分抵扣' }
function reasonLabel(r) { return reasonMap[r] || r }

function formatTime(d) {
  const dt = new Date(d)
  return `${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`
}

async function fetchAccount() {
  try {
    const r = await fetch(`${API_BASE}/v1/points/account`, { credentials: 'include' })
    const j = await r.json()
    if (j.status === 200) account.value = j.data
  } catch (e) {}
}

async function fetchRedeemOptions() {
  try {
    const r = await fetch(`${API_BASE}/v1/points/redeem_options`, { credentials: 'include' })
    const j = await r.json()
    if (j.status === 200) redeemOptions.value = j.data
  } catch (e) {}
}

async function loadLedger() {
  ledgerLoading.value = true
  try {
    const r = await fetch(`${API_BASE}/v1/points/ledger?page=${ledgerPage.value}`, { credentials: 'include' })
    const j = await r.json()
    const list = j.data || []
    ledger.value = [...ledger.value, ...list]
    if (list.length < 20) ledgerFinished.value = true
    else ledgerPage.value++
  } catch (e) { ledgerFinished.value = true }
  ledgerLoading.value = false
}

async function handleRedeem(opt) {
  if (account.value.balance < opt.points) return
  redeemLoading.value = opt.sku
  try {
    const r = await fetch(`${API_BASE}/v1/points/redeem`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: opt.sku })
    })
    const j = await r.json()
    if (j.status === 200) {
      showToast({ message: j.message, position: 'bottom' })
      await fetchAccount()
      // 刷新明细
      ledger.value = []; ledgerPage.value = 1; ledgerFinished.value = false
      await loadLedger()
    } else {
      showToast({ message: j.message || '兑换失败', position: 'bottom' })
    }
  } catch (e) {
    showToast({ message: '网络错误', position: 'bottom' })
  }
  redeemLoading.value = null
}

onMounted(() => {
  fetchAccount()
  fetchRedeemOptions()
})
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "../../style/mixin.scss";

.points-page {
  min-height: 100vh;
  background: #f4f4f4;
  padding-bottom: 1.2rem;
}

.balance-card {
  background: linear-gradient(135deg, #ffd161, #f60);
  margin: 0.2rem 0.24rem;
  border-radius: 0.2rem;
  padding: 0.4rem 0.36rem 0.3rem;
  color: #fff;
  box-shadow: 0 4px 16px rgba(255,100,0,0.2);

  .balance-top {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    .level-badge { font-size: 0.28rem; opacity: 0.9; }
    .balance-num { font-size: 0.9rem; font-weight: bold; line-height: 1; }
    .balance-label { font-size: 0.26rem; opacity: 0.85; }
  }

  .level-progress {
    margin-top: 0.24rem;
    .progress-tip { font-size: 0.22rem; opacity: 0.9; display: block; margin-bottom: 0.1rem; }
    .progress-bar {
      height: 0.1rem;
      background: rgba(255,255,255,0.3);
      border-radius: 0.05rem;
      overflow: hidden;
      .progress-fill { height: 100%; background: #fff; border-radius: 0.05rem; }
    }
  }

  .level-max { margin-top: 0.2rem; font-size: 0.24rem; opacity: 0.9; text-align: center; }
}

.section-title {
  font-size: 0.3rem;
  font-weight: bold;
  color: #333;
  padding: 0.24rem 0.3rem 0.16rem;
}

.redeem-list {
  background: #fff;
  margin-bottom: 0.2rem;
  .redeem-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.28rem 0.3rem;
    border-bottom: 1px solid #f5f5f5;

    .redeem-left {
      display: flex;
      flex-direction: column;
      gap: 0.06rem;
      .redeem-label { font-size: 0.3rem; color: #333; }
      .redeem-valid { font-size: 0.22rem; color: #999; }
    }
    .redeem-right {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      .redeem-points { font-size: 0.28rem; color: #f60; font-weight: bold; }
    }
  }
}

.ledger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.24rem 0.3rem;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;

  .ledger-left {
    display: flex;
    flex-direction: column;
    gap: 0.06rem;
    .ledger-reason { font-size: 0.28rem; color: #333; }
    .ledger-time { font-size: 0.22rem; color: #bbb; }
  }

  .ledger-delta {
    font-size: 0.34rem;
    font-weight: bold;
    &.delta-plus { color: #07c160; }
    &.delta-minus { color: #f60; }
  }
}

.ledger-empty {
  text-align: center;
  padding: 1rem 0;
  color: #bbb;
  font-size: 0.3rem;
}
</style>
