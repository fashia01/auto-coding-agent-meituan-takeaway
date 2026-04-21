import BaseClass from '../../prototype/baseClass'
import CouponTemplate from '../../models/v1/coupon'
import UserCoupon from '../../models/v1/user_coupon'
import AdminModel from '../../models/admin/admin'

class Coupon extends BaseClass {
  constructor() {
    super()
    this.getAvailableCoupons = this.getAvailableCoupons.bind(this)
    this.getUserCoupons = this.getUserCoupons.bind(this)
    this.claimCoupon = this.claimCoupon.bind(this)
  }

  // 2.1 获取当前用户在该餐馆+订单金额下可用的优惠券列表
  async getAvailableCoupons(req, res) {
    const { restaurant_id, order_amount = 0 } = req.query
    const user_id = req.session.admin_id || req.session.user_id
    if (!user_id) {
      return res.send({ status: -1, message: '未登录' })
    }
    try {
      const now = new Date()
      // 查询该用户所有未使用且未过期的券
      const userCoupons = await UserCoupon.find({
        user_id,
        status: 'unused',
        expire_at: { $gt: now }
      })
      if (!userCoupons.length) {
        return res.send({ status: 200, data: [], message: '暂无可用优惠券' })
      }
      const templateIds = userCoupons.map(uc => uc.template_id)
      const templates = await CouponTemplate.find({ id: { $in: templateIds } })
      const templateMap = {}
      templates.forEach(t => { templateMap[t.id] = t })

      // 过滤：满足门槛 + 适用该餐馆（平台券全部可用，店铺券需匹配）
      const amount = parseFloat(order_amount) || 0
      const available = []
      for (const uc of userCoupons) {
        const tpl = templateMap[uc.template_id]
        if (!tpl) continue
        // 检查满足门槛
        if (amount < tpl.threshold) continue
        // 检查店铺适用性
        if (tpl.type === 'restaurant' && tpl.restaurant_id && Number(tpl.restaurant_id) !== Number(restaurant_id)) continue
        // 计算节省金额（用于排序）
        let saving = 0
        if (tpl.discount_type === 'fixed') saving = tpl.value
        else if (tpl.discount_type === 'percent') saving = +(amount * (1 - tpl.value)).toFixed(2)
        else if (tpl.discount_type === 'shipping') saving = 5 // 默认免配送费约5元
        available.push({
          user_coupon_id: uc.id,
          template_id: tpl.id,
          name: tpl.name,
          discount_type: tpl.discount_type,
          threshold: tpl.threshold,
          value: tpl.value,
          expire_at: uc.expire_at,
          saving
        })
      }
      // 按节省金额降序
      available.sort((a, b) => b.saving - a.saving)
      res.send({ status: 200, data: available, message: '获取可用优惠券成功' })
    } catch (err) {
      console.log('getAvailableCoupons error', err)
      res.send({ status: -1, message: '获取优惠券失败' })
    }
  }

  // 2.2 获取当前用户所有券（含状态）
  async getUserCoupons(req, res) {
    const user_id = req.session.admin_id || req.session.user_id
    if (!user_id) {
      return res.send({ status: -1, message: '未登录' })
    }
    try {
      const now = new Date()
      // 将已过期但状态还是 unused 的券自动标记为 expired
      await UserCoupon.updateMany(
        { user_id, status: 'unused', expire_at: { $lte: now } },
        { $set: { status: 'expired' } }
      )
      const userCoupons = await UserCoupon.find({ user_id }).sort({ expire_at: 1 })
      const templateIds = userCoupons.map(uc => uc.template_id)
      const templates = await CouponTemplate.find({ id: { $in: templateIds } })
      const templateMap = {}
      templates.forEach(t => { templateMap[t.id] = t })

      const result = userCoupons.map(uc => {
        const tpl = templateMap[uc.template_id] || {}
        return {
          user_coupon_id: uc.id,
          template_id: uc.template_id,
          name: tpl.name || '优惠券',
          discount_type: tpl.discount_type,
          threshold: tpl.threshold,
          value: tpl.value,
          status: uc.status,
          expire_at: uc.expire_at,
          used_order_id: uc.used_order_id
        }
      })
      res.send({ status: 200, data: result, message: '获取我的优惠券成功' })
    } catch (err) {
      console.log('getUserCoupons error', err)
      res.send({ status: -1, message: '获取优惠券失败' })
    }
  }

  // 2.3 用户领取指定模板券
  async claimCoupon(req, res) {
    const { template_id } = req.body
    const user_id = req.session.admin_id || req.session.user_id
    if (!user_id || !template_id) {
      return res.send({ status: -1, message: '参数有误' })
    }
    try {
      const tpl = await CouponTemplate.findOne({ id: Number(template_id) })
      if (!tpl) {
        return res.send({ status: -1, message: '优惠券模板不存在' })
      }
      // 检查是否已经领取过同模板未使用的券
      const existing = await UserCoupon.findOne({ user_id, template_id: tpl.id, status: 'unused' })
      if (existing) {
        return res.send({ status: -1, message: '您已领取过此优惠券' })
      }
      const id = await this.getId('coupon_id').catch(() => Date.now())
      const expireAt = new Date(Date.now() + tpl.valid_days * 24 * 3600 * 1000)
      const uc = new UserCoupon({
        id,
        user_id,
        template_id: tpl.id,
        status: 'unused',
        expire_at: expireAt
      })
      await uc.save()
      res.send({ status: 200, data: { user_coupon_id: id, expire_at: expireAt }, message: '领券成功' })
    } catch (err) {
      console.log('claimCoupon error', err)
      res.send({ status: -1, message: '领券失败' })
    }
  }
}

export default new Coupon()
