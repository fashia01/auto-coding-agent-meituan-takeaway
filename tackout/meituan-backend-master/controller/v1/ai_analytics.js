/* eslint-disable no-console */
import AIInteractionLog from '../../models/v1/ai_interaction_log'

export async function getAnalytics(req, res) {
  const days = Number(req.query.days) || 7
  const since = new Date(Date.now() - days * 86400000)

  try {
    // 总会话数
    const session_count = await AIInteractionLog.distinct('session_id', {
      event_type: 'chat_start', created_at: { $gte: since }
    }).then(arr => arr.length).catch(() => 0)

    // 推荐采纳率
    const shown = await AIInteractionLog.countDocuments({ event_type: 'tool_call', tool_name: 'search_and_rank_foods', created_at: { $gte: since } })
    const adopted = await AIInteractionLog.countDocuments({ event_type: 'recommendation_adopted', created_at: { $gte: since } })
    const adoption_rate = shown > 0 ? +((adopted / shown) * 100).toFixed(1) : 0

    // 工具调用总次数
    const tool_call_total = await AIInteractionLog.countDocuments({ event_type: 'tool_call', created_at: { $gte: since } })

    // 工具调用分布（各 tool 被调用次数）
    const toolDistRaw = await AIInteractionLog.aggregate([
      { $match: { event_type: 'tool_call', created_at: { $gte: since } } },
      { $group: { _id: '$tool_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
    const tool_distribution = toolDistRaw.map(t => ({ tool: t._id, count: t.count }))

    // 平均下单对话轮次（chat_start 到 recommendation_adopted 之间的 tool_call 次数）
    const sessionStarts = await AIInteractionLog.find({ event_type: 'chat_start', created_at: { $gte: since } }).select('session_id created_at').lean()
    const sessionAdopts = await AIInteractionLog.find({ event_type: 'recommendation_adopted', created_at: { $gte: since } }).select('session_id created_at').lean()
    const adoptSet = new Set(sessionAdopts.map(s => s.session_id))

    let totalTurns = 0
    let countWithOrder = 0
    for (const s of sessionStarts) {
      if (!adoptSet.has(s.session_id)) continue
      const turns = await AIInteractionLog.countDocuments({
        session_id: s.session_id,
        event_type: 'tool_call',
        created_at: { $gte: s.created_at }
      })
      totalTurns += turns
      countWithOrder++
    }
    const avg_turns_to_order = countWithOrder > 0 ? +(totalTurns / countWithOrder).toFixed(1) : 0

    res.send({
      status: 200,
      data: {
        days,
        session_count,
        adoption_rate,
        tool_call_total,
        avg_turns_to_order,
        tool_distribution
      }
    })
  } catch (err) {
    console.log('getAnalytics error', err.message)
    res.send({ status: -1, message: '获取分析数据失败' })
  }
}

export default { getAnalytics }
