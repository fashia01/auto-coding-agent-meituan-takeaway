<template>
  <div class="ai-dashboard">
    <v-head title="AI 决策分析" goBack="true" />

    <!-- 时间范围切换 -->
    <div class="date-tabs">
      <span :class="['tab', days === 7 && 'tab--active']" @click="setDays(7)">近7天</span>
      <span :class="['tab', days === 30 && 'tab--active']" @click="setDays(30)">近30天</span>
    </div>

    <!-- 4个核心指标卡 -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-value">{{ data.adoption_rate != null ? data.adoption_rate + '%' : '--' }}</span>
        <span class="metric-label">推荐采纳率</span>
        <span class="metric-sub">用户点击推荐菜品 / 总推荐次数</span>
      </div>
      <div class="metric-card">
        <span class="metric-value">{{ data.avg_turns_to_order != null ? data.avg_turns_to_order : '--' }}</span>
        <span class="metric-label">平均下单轮次</span>
        <span class="metric-sub">对话开始到首次采纳的工具调用数</span>
      </div>
      <div class="metric-card">
        <span class="metric-value">{{ data.session_count != null ? data.session_count : '--' }}</span>
        <span class="metric-label">AI 对话总数</span>
        <span class="metric-sub">近{{ days }}天发起的对话会话</span>
      </div>
      <div class="metric-card">
        <span class="metric-value">{{ data.tool_call_total != null ? data.tool_call_total : '--' }}</span>
        <span class="metric-label">工具调用总次数</span>
        <span class="metric-sub">Agent 执行工具的累计次数</span>
      </div>
    </div>

    <!-- 工具调用分布 -->
    <div class="section-title">🔧 工具调用分布</div>
    <div class="tool-dist" v-if="data.tool_distribution && data.tool_distribution.length">
      <div v-for="t in data.tool_distribution" :key="t.tool" class="tool-bar">
        <span class="tool-name">{{ toolLabel(t.tool) }}</span>
        <div class="bar-wrap">
          <div class="bar-fill" :style="{ width: barWidth(t.count) + '%' }"></div>
        </div>
        <span class="tool-count">{{ t.count }}次</span>
      </div>
    </div>
    <div v-else class="empty-hint">{{ loading ? '加载中...' : '暂无工具调用数据' }}</div>

    <!-- 说明 -->
    <div class="dashboard-note">
      <p>📊 数据说明：</p>
      <p>• 推荐采纳率 = 用户将AI推荐菜品加入购物车的次数 / 搜索工具调用次数</p>
      <p>• 工具调用包含：菜品搜索、促销查询、购物车操作、评论摘要、套餐规划等</p>
      <p>• 本面板数据可用于论文实验章节的效果验证</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = 'http://localhost:3000'
const days = ref(7)
const loading = ref(false)
const data = ref({})

const toolLabelMap = {
  search_and_rank_foods: '菜品搜索排序',
  get_active_promotions: '促销/优惠查询',
  add_to_cart: '加入购物车',
  clear_cart: '清空购物车',
  view_cart: '查看购物车',
  plan_meal_combo: '套餐规划',
  get_restaurant_reviews: '餐馆评论摘要',
  get_my_messages: '消息查询',
  set_dietary_constraints: '饮食约束设置',
  get_dietary_constraints: '饮食约束查询'
}
function toolLabel(t) { return toolLabelMap[t] || t }

function barWidth(count) {
  const max = Math.max(...(data.value.tool_distribution || []).map(t => t.count), 1)
  return Math.round((count / max) * 100)
}

async function fetchData() {
  loading.value = true
  try {
    const r = await fetch(`${API_BASE}/v1/ai/analytics?days=${days.value}`, { credentials: 'include' })
    const j = await r.json()
    if (j.status === 200) data.value = j.data
  } catch (e) {}
  loading.value = false
}

function setDays(d) { days.value = d; fetchData() }

onMounted(fetchData)
</script>

<style lang="scss" scoped>
@import "../../style/mixin.scss";

.ai-dashboard {
  min-height: 100vh;
  background: #f4f4f4;
  padding-bottom: 1.5rem;
}

.date-tabs {
  display: flex;
  gap: 0.2rem;
  padding: 0.24rem 0.3rem 0.16rem;
  .tab {
    padding: 0.1rem 0.3rem;
    border-radius: 0.3rem;
    font-size: 0.28rem;
    color: #999;
    background: #fff;
    cursor: pointer;
    border: 1px solid #e0e0e0;
    &--active { background: #ffd161; color: #333; border-color: #ffd161; font-weight: 500; }
  }
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.16rem;
  padding: 0 0.24rem 0.24rem;
}

.metric-card {
  background: #fff;
  border-radius: 0.16rem;
  padding: 0.28rem 0.24rem;
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);

  .metric-value { font-size: 0.6rem; font-weight: bold; color: #333; line-height: 1; }
  .metric-label { font-size: 0.28rem; color: #333; font-weight: 500; }
  .metric-sub { font-size: 0.22rem; color: #bbb; line-height: 1.3; }
}

.section-title { font-size: 0.3rem; font-weight: bold; color: #333; padding: 0.1rem 0.3rem 0.16rem; }

.tool-dist {
  background: #fff;
  margin: 0 0;
  padding: 0.1rem 0.3rem;
}

.tool-bar {
  display: flex;
  align-items: center;
  gap: 0.16rem;
  padding: 0.18rem 0;
  border-bottom: 1px solid #f5f5f5;
  .tool-name { width: 2.2rem; font-size: 0.26rem; color: #333; flex-shrink: 0; }
  .bar-wrap { flex: 1; height: 0.2rem; background: #f0f0f0; border-radius: 0.1rem; overflow: hidden;
    .bar-fill { height: 100%; background: linear-gradient(to right, #ffd161, #f60); border-radius: 0.1rem; transition: width 0.4s ease; }
  }
  .tool-count { width: 0.8rem; text-align: right; font-size: 0.24rem; color: #f60; font-weight: 500; flex-shrink: 0; }
}

.empty-hint { text-align: center; padding: 1rem; color: #ccc; font-size: 0.28rem; }

.dashboard-note {
  margin: 0.3rem 0.24rem;
  background: #fff8e6;
  border-radius: 0.12rem;
  padding: 0.24rem;
  p { font-size: 0.24rem; color: #888; line-height: 1.7; margin: 0; }
  p:first-child { font-weight: 500; color: #555; margin-bottom: 0.08rem; }
}
</style>
