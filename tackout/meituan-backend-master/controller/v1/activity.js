/* eslint-disable no-console */
import BaseClass from '../../prototype/baseClass'
import Activity from '../../models/v1/activity'

class ActivityController extends BaseClass {
  constructor() {
    super()
    this.getActiveActivities = this.getActiveActivities.bind(this)
    this.joinFlashSale = this.joinFlashSale.bind(this)
  }

  // GET /v1/activity/active?restaurant_id=
  async getActiveActivities(req, res) {
    const { restaurant_id } = req.query
    const now = new Date()
    try {
      const query = { start_at: { $lte: now }, end_at: { $gte: now } }
      if (restaurant_id) {
        // 平台活动(null) + 该餐馆专属活动
        query.$or = [
          { restaurant_id: null },
          { restaurant_id: Number(restaurant_id) }
        ]
      }
      const activities = await Activity.find(query).sort({ end_at: 1 }).lean()
      res.send({ status: 200, data: activities })
    } catch (err) {
      console.log('getActiveActivities error', err.message)
      res.send({ status: -1, message: '获取活动失败' })
    }
  }

  // POST /v1/activity/:id/join — 秒杀原子抢购
  async joinFlashSale(req, res) {
    const activity_id = Number(req.params.id)
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })

    const now = new Date()
    try {
      // 原子操作：sold_count < total_stock 且在有效期内才自增
      const updated = await Activity.findOneAndUpdate(
        {
          id: activity_id,
          type: 'flash_sale',
          start_at: { $lte: now },
          end_at: { $gte: now },
          $expr: { $lt: ['$sold_count', '$total_stock'] }
        },
        { $inc: { sold_count: 1 } },
        { new: true }
      )

      if (!updated) {
        return res.send({ status: -1, message: 'SOLD_OUT', code: 'SOLD_OUT' })
      }

      res.send({
        status: 200,
        message: '抢购成功！',
        data: {
          activity_id,
          remaining: updated.total_stock - updated.sold_count,
          discount_type: updated.discount_type,
          threshold: updated.threshold,
          value: updated.value
        }
      })
    } catch (err) {
      console.log('joinFlashSale error', err.message)
      res.send({ status: -1, message: '抢购失败，请重试' })
    }
  }
}

export default new ActivityController()
