/* eslint-disable no-console */
/**
 * pushRules.js — AI 主动推送规则引擎
 *
 * checkPushRules(user_id) 按优先级检查三类规则：
 *   规则1（最高）：负信号修正 — ai_rejected 后无 order_delivered
 *   规则2：连续重复提示 — 最近3条相同标签，建议换口味
 *   规则3：时段规律 — 当前小时在 peak_hours 内
 *
 * 每用户每天最多推1次（内存 Map 控制）
 */

import TasteLog from '../models/v1/taste_log'
import { getUserTasteProfile } from '../controller/v1/taste'

// userId → lastPushDate（'YYYY-MM-DD'）
const lastPushMap = new Map()

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * 检查用户是否符合推送条件
 * @param {string} user_id
 * @returns {Promise<{message: string, push_context: string}|null>}
 */
async function checkPushRules(user_id) {
  try {
    // 频率限制：每天最多推1次
    const today = todayStr()
    if (lastPushMap.get(String(user_id)) === today) {
      return null
    }

    const since90d = new Date(Date.now() - 90 * 24 * 3600 * 1000)

    // ── 规则1：负信号修正（最高优先级）────────────────────────
    // 条件：最近1条 ai_rejected 信号存在，且此后无 order_delivered
    const lastRejected = await TasteLog.findOne({
      user_id,
      signal_type: 'ai_rejected',
      created_at: { $gte: since90d }
    }).sort({ created_at: -1 }).lean()

    if (lastRejected) {
      const afterRejected = await TasteLog.findOne({
        user_id,
        signal_type: 'order_delivered',
        created_at: { $gt: lastRejected.created_at }
      }).lean()

      if (!afterRejected) {
        const rejectedTags = lastRejected.food_tags || []
        const tagDesc = rejectedTags.slice(0, 2).join('、') || '上次推荐的菜品'
        lastPushMap.set(String(user_id), today)
        return {
          message: `上次推荐的${tagDesc}你不太满意，我重新帮你找找 ～`,
          push_context: `上次AI推荐被用户拒绝，用户不喜欢含「${rejectedTags.join('、')}」标签的菜品。本次请主动道歉并避免推荐含这些标签的菜品，重新推荐口味不同的菜品。`
        }
      }
    }

    // ── 规则2：连续重复提示（换口味）────────────────────────
    const latest3 = await TasteLog.find({
      user_id,
      signal_type: 'order_delivered',
      created_at: { $gte: since90d }
    }).sort({ created_at: -1 }).limit(3).lean()

    if (latest3.length === 3) {
      const firstTags = latest3.map(l => (l.food_tags && l.food_tags[0]) || null)
      if (firstTags[0] && firstTags[0] === firstTags[1] && firstTags[1] === firstTags[2]) {
        const repeatTag = firstTags[0]
        lastPushMap.set(String(user_id), today)
        return {
          message: `连续点了3次${repeatTag}了，要不要换个口味？🍴`,
          push_context: `用户已连续3次下单含「${repeatTag}」标签的菜品，本次请主动推荐不含「${repeatTag}」的其他口味菜品，帮助用户丰富饮食选择。`
        }
      }
    }

    // ── 规则3：时段规律推送 ──────────────────────────────────
    const profile = await getUserTasteProfile(user_id, 3)
    const patterns = profile.behaviorPatterns
    if (patterns && patterns.peak_hours && patterns.peak_hours.length > 0) {
      const currentHour = new Date().getHours()
      // 检查当前小时是否在 peak_hours 附近（±1小时）
      const isNearPeak = patterns.peak_hours.some(h => Math.abs(h - currentHour) <= 1)
      if (isNearPeak) {
        const topTag = (profile.topTags && profile.topTags[0]) || '美食'
        const timeLabel = currentHour >= 6 && currentHour < 10 ? '早餐'
          : currentHour >= 10 && currentHour < 14 ? '午餐'
          : currentHour >= 14 && currentHour < 17 ? '下午茶'
          : currentHour >= 17 && currentHour < 21 ? '晚餐' : '宵夜'
        lastPushMap.set(String(user_id), today)
        return {
          message: `快到${timeLabel}时间了，帮你推荐一份${topTag}？🍱`,
          push_context: `用户习惯在当前时段点餐，偏好「${topTag}」。请直接推荐符合时段和口味偏好的菜品，主动热情地开始服务。`
        }
      }
    }

    return null
  } catch (err) {
    console.log('[PushRules] checkPushRules failed:', err.message)
    return null
  }
}

export { checkPushRules }
