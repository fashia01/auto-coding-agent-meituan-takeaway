/* eslint-disable no-console */
import BaseClass from '../../prototype/baseClass'
import { PointsAccount, PointsLedger } from '../../models/v1/points'
import UserCoupon from '../../models/v1/user_coupon'
import CouponTemplate from '../../models/v1/coupon'

// ── 等级定义 ─────────────────────────────────────────────────
const LEVELS = [
  { name: '钻石', icon: '💎', min: 5000, bonus: 0.15 },
  { name: '金牌', icon: '🥇', min: 2000, bonus: 0.10 },
  { name: '银牌', icon: '🥈', min: 500,  bonus: 0.05 },
  { name: '铜牌', icon: '🥉', min: 0,    bonus: 0.00 },
]

function getLevel(total_earned) {
  return LEVELS.find(l => total_earned >= l.min) || LEVELS[LEVELS.length - 1]
}

function getNextLevel(total_earned) {
  const idx = LEVELS.findIndex(l => total_earned >= l.min)
  return idx > 0 ? LEVELS[idx - 1] : null
}

// ── 兑换规则 ─────────────────────────────────────────────────
const REDEEM_OPTIONS = [
  { sku: 'A', points: 200, template_id: 1001, label: '满20减3券', valid_days: 1 },
  { sku: 'B', points: 500, template_id: 1004, label: '满40减8券', valid_days: 3 },
  { sku: 'C', points: 1000, template_id: 1021, label: '免配送费券', valid_days: 7 },
]

// ── 积分发放工具函数（供外部调用）──────────────────────────────
async function awardPoints(user_id, amount, related_id) {
  if (!user_id || amount <= 0) return
  try {
    const uid = Number(user_id)
    // 去重：同一 order_id 只发一次
    const exists = await PointsLedger.findOne({ user_id: uid, reason: 'order_reward', related_id: Number(related_id) }).lean()
    if (exists) return

    // 查当前账户等级，计算加成
    const account = await PointsAccount.findOne({ user_id: uid }).lean()
    const totalEarned = account ? account.total_earned : 0
    const level = getLevel(totalEarned)
    const earned = Math.ceil(amount * (1 + level.bonus))  // 加成后取整

    // 生成流水 id
    const lastLedger = await PointsLedger.findOne().sort({ id: -1 }).lean()
    const ledgerId = lastLedger ? lastLedger.id + 1 : 200001

    await PointsLedger.create({ id: ledgerId, user_id: uid, delta: earned, reason: 'order_reward', related_id: Number(related_id), created_at: new Date() })
    await PointsAccount.findOneAndUpdate(
      { user_id: uid },
      { $inc: { balance: earned, total_earned: earned }, $set: { updated_at: new Date() } },
      { upsert: true }
    )
    console.log(`[积分] 用户 ${uid} 获得 ${earned} 积分（订单 ${related_id}）`)
  } catch (err) {
    console.log('[积分] awardPoints 失败:', err.message)
  }
}

// ── 积分扣减工具函数（下单时调用）────────────────────────────
async function deductPoints(user_id, points_to_deduct, order_id) {
  if (!user_id || points_to_deduct <= 0) return false
  try {
    const uid = Number(user_id)
    // 原子减少（防止余额为负）
    const updated = await PointsAccount.findOneAndUpdate(
      { user_id: uid, balance: { $gte: points_to_deduct } },
      { $inc: { balance: -points_to_deduct }, $set: { updated_at: new Date() } },
      { new: true }
    )
    if (!updated) return false

    const lastLedger = await PointsLedger.findOne().sort({ id: -1 }).lean()
    const ledgerId = lastLedger ? lastLedger.id + 1 : 200001
    await PointsLedger.create({ id: ledgerId, user_id: uid, delta: -points_to_deduct, reason: 'deduction', related_id: Number(order_id), created_at: new Date() })
    return true
  } catch (err) {
    console.log('[积分] deductPoints 失败:', err.message)
    return false
  }
}

class PointsController extends BaseClass {
  constructor() {
    super()
    this.getAccount = this.getAccount.bind(this)
    this.getLedger = this.getLedger.bind(this)
    this.redeem = this.redeem.bind(this)
    this.getRedeemOptions = this.getRedeemOptions.bind(this)
  }

  // GET /v1/points/account
  async getAccount(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })

    try {
      const uid = Number(user_id)
      const account = await PointsAccount.findOne({ user_id: uid }).lean()
      const balance = account ? account.balance : 0
      const total_earned = account ? account.total_earned : 0
      const level = getLevel(total_earned)
      const nextLevel = getNextLevel(total_earned)

      res.send({
        status: 200,
        data: {
          balance,
          total_earned,
          level_name: level.name,
          level_icon: level.icon,
          level_bonus: level.bonus,
          next_level_name: nextLevel ? nextLevel.name : null,
          next_level_min: nextLevel ? nextLevel.min : null,
          progress: nextLevel ? Math.min(100, Math.round((total_earned - level.min) / (nextLevel.min - level.min) * 100)) : 100
        }
      })
    } catch (err) {
      res.send({ status: -1, message: '获取积分失败' })
    }
  }

  // GET /v1/points/ledger?page=
  async getLedger(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })

    const page = Number(req.query.page) || 1
    const pageSize = 20
    try {
      const uid = Number(user_id)
      const ledger = await PointsLedger.find({ user_id: uid })
        .sort({ created_at: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
      res.send({ status: 200, data: ledger })
    } catch (err) {
      res.send({ status: -1, message: '获取明细失败' })
    }
  }

  // GET /v1/points/redeem_options
  async getRedeemOptions(req, res) {
    res.send({ status: 200, data: REDEEM_OPTIONS })
  }

  // POST /v1/points/redeem  body: { sku: 'A'|'B'|'C' }
  async redeem(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })

    const { sku } = req.body
    const option = REDEEM_OPTIONS.find(o => o.sku === sku)
    if (!option) return res.send({ status: -1, message: '无效兑换选项' })

    const uid = Number(user_id)
    try {
      // 扣积分（原子）
      const updated = await PointsAccount.findOneAndUpdate(
        { user_id: uid, balance: { $gte: option.points } },
        { $inc: { balance: -option.points }, $set: { updated_at: new Date() } },
        { new: true }
      )
      if (!updated) return res.send({ status: -1, message: '积分不足' })

      // 发券
      const tpl = await CouponTemplate.findOne({ id: option.template_id }).lean()
      if (!tpl) {
        // 回滚积分
        await PointsAccount.updateOne({ user_id: uid }, { $inc: { balance: option.points } })
        return res.send({ status: -1, message: '券模板不存在，已退还积分' })
      }
      const lastCoupon = await UserCoupon.findOne().sort({ id: -1 }).lean()
      const couponId = lastCoupon ? lastCoupon.id + 1 : 90001
      await UserCoupon.create({
        id: couponId,
        user_id: uid,
        template_id: option.template_id,
        status: 'unused',
        expire_at: new Date(Date.now() + option.valid_days * 86400000),
        claimed_at: new Date(),
        source: 'points_redeem'
      })

      // 写流水
      const lastLedger = await PointsLedger.findOne().sort({ id: -1 }).lean()
      await PointsLedger.create({
        id: (lastLedger ? lastLedger.id : 200000) + 1,
        user_id: uid,
        delta: -option.points,
        reason: 'redemption',
        related_id: couponId,
        created_at: new Date()
      })

      res.send({ status: 200, message: `兑换成功！${option.label}已发放到您的账户` })
    } catch (err) {
      console.log('redeem error', err.message)
      res.send({ status: -1, message: '兑换失败，请重试' })
    }
  }
}

export { awardPoints, deductPoints, LEVELS, getLevel, REDEEM_OPTIONS }
export default new PointsController()
