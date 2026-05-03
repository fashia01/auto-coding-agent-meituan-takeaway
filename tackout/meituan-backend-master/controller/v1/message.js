/* eslint-disable no-console */
import BaseClass from '../../prototype/baseClass'
import Message from '../../models/v1/message'

class MessageController extends BaseClass {
  constructor() {
    super()
    this.listMessages = this.listMessages.bind(this)
    this.getUnreadCount = this.getUnreadCount.bind(this)
    this.markRead = this.markRead.bind(this)
    this.markAllRead = this.markAllRead.bind(this)
  }

  // GET /v1/message/list?category=&page=
  async listMessages(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })

    const { category, page = 1 } = req.query
    const pageSize = 20
    const query = { user_id: Number(user_id) }
    if (category) query.category = category

    try {
      const messages = await Message.find(query)
        .sort({ created_at: -1 })
        .skip((Number(page) - 1) * pageSize)
        .limit(pageSize)
        .lean()

      res.send({ status: 200, data: messages })
    } catch (err) {
      console.log('listMessages error', err.message)
      res.send({ status: -1, message: '获取消息失败' })
    }
  }

  // GET /v1/message/unread_count
  async getUnreadCount(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: 200, data: { count: 0 } })

    try {
      const count = await Message.countDocuments({ user_id: Number(user_id), is_read: false })
      res.send({ status: 200, data: { count } })
    } catch (err) {
      res.send({ status: 200, data: { count: 0 } })
    }
  }

  // POST /v1/message/:id/read
  async markRead(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })

    try {
      await Message.updateOne(
        { id: Number(req.params.id), user_id: Number(user_id) },
        { $set: { is_read: true } }
      )
      res.send({ status: 200, message: '已读' })
    } catch (err) {
      res.send({ status: -1, message: '操作失败' })
    }
  }

  // POST /v1/message/read_all
  async markAllRead(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })

    try {
      await Message.updateMany(
        { user_id: Number(user_id), is_read: false },
        { $set: { is_read: true } }
      )
      res.send({ status: 200, message: '全部已读' })
    } catch (err) {
      res.send({ status: -1, message: '操作失败' })
    }
  }
}

// ── 消息写入工具函数（供其他 controller 调用）──────────────
async function writeMessage(user_id, category, title, content, related_type, related_id) {
  if (!user_id) return
  try {
    const uid = Number(user_id)
    // 去重：同一用户+关联实体+分类只保留最新一条（upsert）
    const dedupeQuery = { user_id: uid, category }
    if (related_type) dedupeQuery.related_type = related_type
    if (related_id) dedupeQuery.related_id = Number(related_id)

    const existing = related_type && related_id
      ? await Message.findOne(dedupeQuery).lean()
      : null

    if (existing) {
      // 更新已有消息（状态变更场景：同一订单的多次状态更新各自独立，用 title 区分）
      // 若 title 相同才真正去重，否则新建
      if (existing.title === title) return
    }

    // 生成新 id
    const last = await Message.findOne().sort({ id: -1 }).lean()
    const newId = last ? last.id + 1 : 100001

    await Message.create({
      id: newId,
      user_id: uid,
      category,
      title,
      content: content || '',
      is_read: false,
      related_type: related_type || '',
      related_id: related_id ? Number(related_id) : null,
      created_at: new Date()
    })

    // 超量清理：保留最近100条
    const total = await Message.countDocuments({ user_id: uid })
    if (total > 100) {
      const oldest = await Message.find({ user_id: uid })
        .sort({ created_at: 1 })
        .limit(total - 100)
        .lean()
      const oldIds = oldest.map(m => m._id)
      await Message.deleteMany({ _id: { $in: oldIds } })
    }
  } catch (err) {
    console.log('[Message] writeMessage failed:', err.message)
  }
}

export { writeMessage }
export default new MessageController()
