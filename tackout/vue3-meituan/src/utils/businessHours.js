/**
 * businessHours.js — 营业状态工具函数
 *
 * getBusinessStatus(start, end)
 *   @param {string} start - 开始营业时间，格式 "HH:mm" 或 "H:mm"（e.g. "9:00"）
 *   @param {string} end   - 结束营业时间，格式同上
 *   @returns {'open' | 'closed' | 'opening_soon'}
 *     - open:         当前在营业时间内
 *     - opening_soon: 距开始营业 ≤ 30 分钟
 *     - closed:       已打烊或今日尚未开始
 */
export function getBusinessStatus(start, end) {
  // 无营业时间数据 → 默认营业中
  if (!start || !end) return 'open'

  const now = new Date()
  const toMinutes = (timeStr) => {
    const [h, m] = timeStr.trim().split(':').map(Number)
    return h * 60 + (m || 0)
  }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)

  // 跨午夜处理（如 22:00 ~ 02:00）
  if (endMin < startMin) {
    // 跨午夜：nowMin >= startMin 或 nowMin < endMin 时为营业中
    if (nowMin >= startMin || nowMin < endMin) return 'open'
    // 距下次开始不足 30 分钟
    const minutesToOpen = startMin - nowMin
    if (minutesToOpen <= 30 && minutesToOpen > 0) return 'opening_soon'
    return 'closed'
  }

  // 正常时间段
  if (nowMin >= startMin && nowMin < endMin) return 'open'
  // 即将开业（30 分钟内）
  const minutesToOpen = startMin - nowMin
  if (minutesToOpen > 0 && minutesToOpen <= 30) return 'opening_soon'
  return 'closed'
}
