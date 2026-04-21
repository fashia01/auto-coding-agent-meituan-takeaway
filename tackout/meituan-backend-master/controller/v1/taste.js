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
 * 返回：{ topTags: string[], priceRange: {min,max,avg} }
 */
async function getUserTasteProfile(user_id, limit = 5) {
  try {
    // 聚合最近 90 天的口味日志，统计 tag 出现频次
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000)
    const pipeline = [
      { $match: { user_id, created_at: { $gte: since } } },
      { $unwind: '$food_tags' },
      { $group: { _id: '$food_tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]
    const tagAgg = await TasteLog.aggregate(pipeline)
    const topTags = tagAgg.map(t => t._id)

    // 聚合价格区间
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

    return { topTags, priceRange }
  } catch (err) {
    console.log('[TasteLog] getUserTasteProfile failed:', err.message)
    return { topTags: [], priceRange: null }
  }
}

export { writeTasteLog, getUserTasteProfile }
