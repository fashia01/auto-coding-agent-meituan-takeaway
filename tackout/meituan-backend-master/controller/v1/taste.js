import TasteLog from '../../models/v1/taste_log'

/**
 * writeTasteLog — 记录用户口味信号（内部函数，非路由）
 *
 * @param {number} user_id      - 用户数字 ID
 * @param {string[]} food_tags  - 从订单/评论中提取的标签数组
 * @param {{min,max,avg}} price_range - 价格区间
 * @param {number} restaurant_id
 * @param {'order_delivered'|'high_rating'} signal_type
 */
async function writeTasteLog(user_id, food_tags, price_range, restaurant_id, signal_type = 'order_delivered') {
  try {
    if (!user_id || !food_tags || !food_tags.length) return
    await TasteLog.create({
      user_id,
      signal_type,
      food_tags,
      price_range: price_range || {},
      restaurant_id: restaurant_id || null,
      created_at: new Date()
    })
  } catch (err) {
    // 口味记录失败不应影响主流程，仅静默 log
    console.log('[TasteLog] write failed:', err.message)
  }
}

/**
 * getUserTasteProfile — 聚合用户口味画像（内部函数）
 * 返回：{ topTags: string[], excludeTags: string[], priceRange: {min,max,avg}, behaviorPatterns: {peak_hours, repeat_tag} }
 * @param {string} user_id
 * @param {number} limit  正向 TOP 标签数量
 * @param {object} context 可选上下文 { hour: number, recentTags: string[] }
 */
async function getUserTasteProfile(user_id, limit = 5, context = {}) {
  try {
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000)

    // ── 正向标签（order_delivered + high_rating）──
    const positivePipeline = [
      { $match: { user_id, signal_type: { $in: ['order_delivered', 'high_rating'] }, created_at: { $gte: since } } },
      { $unwind: '$food_tags' },
      { $group: { _id: '$food_tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit * 2 }  // 多取一些，后面可能要降权
    ]
    const posTagAgg = await TasteLog.aggregate(positivePipeline)
    let tagScores = posTagAgg.map(t => ({ tag: t._id, score: t.count }))

    // 近期避重：recentTags 中重复 ≥3 次的标签降权 50%
    if (context.recentTags && context.recentTags.length) {
      const recentFreq = {}
      context.recentTags.forEach(t => { recentFreq[t] = (recentFreq[t] || 0) + 1 })
      tagScores = tagScores.map(item => {
        if ((recentFreq[item.tag] || 0) >= 3) {
          return { ...item, score: item.score * 0.5 }
        }
        return item
      })
    }

    tagScores.sort((a, b) => b.score - a.score)
    const topTags = tagScores.slice(0, limit).map(t => t.tag)

    // ── 负向标签（low_rating + ai_rejected，出现 ≥2 次视为强负偏好）──
    const negativePipeline = [
      { $match: { user_id, signal_type: { $in: ['low_rating', 'order_cancelled', 'ai_rejected'] }, created_at: { $gte: since } } },
      { $unwind: '$food_tags' },
      { $group: { _id: '$food_tags', count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]
    const negTagAgg = await TasteLog.aggregate(negativePipeline)
    const excludeTags = negTagAgg.map(t => t._id)

    // ── 价格区间 ──
    const priceAgg = await TasteLog.aggregate([
      { $match: { user_id, created_at: { $gte: since }, 'price_range.avg': { $gt: 0 } } },
      { $group: {
        _id: null,
        avgPrice: { $avg: '$price_range.avg' },
        minPrice: { $min: '$price_range.min' },
        maxPrice: { $max: '$price_range.max' }
      }}
    ])
    const priceRange = priceAgg.length ? {
      min: Math.round(priceAgg[0].minPrice || 0),
      max: Math.round(priceAgg[0].maxPrice || 0),
      avg: Math.round(priceAgg[0].avgPrice || 0)
    } : null

    // ── 行为模式分析（供推送引擎使用）──
    let behaviorPatterns = null
    try {
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000)
      const recentDelivered = await TasteLog.find({
        user_id,
        signal_type: 'order_delivered',
        created_at: { $gte: since7d }
      }).sort({ created_at: -1 }).lean()

      // peak_hours：统计各小时下单次数，返回出现 ≥4 次的小时列表
      const hourCount = {}
      recentDelivered.forEach(log => {
        const h = new Date(log.created_at).getHours()
        hourCount[h] = (hourCount[h] || 0) + 1
      })
      const peak_hours = Object.keys(hourCount)
        .filter(h => hourCount[h] >= 4)
        .map(h => Number(h))

      // repeat_tag：最近3条 order_delivered 的首要标签完全相同则返回该标签
      const latest3 = recentDelivered.slice(0, 3)
      let repeat_tag = null
      if (latest3.length === 3) {
        const firstTags = latest3.map(l => (l.food_tags && l.food_tags[0]) || null)
        if (firstTags[0] && firstTags[0] === firstTags[1] && firstTags[1] === firstTags[2]) {
          repeat_tag = firstTags[0]
        }
      }

      behaviorPatterns = { peak_hours, repeat_tag }
    } catch (err) {
      console.log('[TasteLog] behaviorPatterns analysis failed:', err.message)
    }

    return { topTags, excludeTags, priceRange, behaviorPatterns }
  } catch (err) {
    console.log('[TasteLog] getUserTasteProfile failed:', err.message)
    return { topTags: [], excludeTags: [], priceRange: null, behaviorPatterns: null }
  }
}

export { writeTasteLog, getUserTasteProfile }
