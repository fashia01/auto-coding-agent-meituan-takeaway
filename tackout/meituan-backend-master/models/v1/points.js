import mongoose from 'mongoose'

const Schema = mongoose.Schema

// 积分账户（每用户一条）
const pointsAccountSchema = new Schema({
  user_id: { type: Number, required: true, unique: true },
  balance: { type: Number, default: 0 },        // 当前可用余额
  total_earned: { type: Number, default: 0 },    // 累计获得（用于等级计算）
  updated_at: { type: Date, default: Date.now }
})

// 积分流水（append-only）
const pointsLedgerSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  user_id: { type: Number, required: true },
  delta: { type: Number, required: true },        // 正=获得 负=消耗
  reason: { type: String, enum: ['order_reward', 'redemption', 'deduction'], required: true },
  related_id: { type: Number, default: null },    // order_id 或 redeem SKU id
  created_at: { type: Date, default: Date.now }
})

pointsAccountSchema.index({ user_id: 1 })
pointsLedgerSchema.index({ user_id: 1, created_at: -1 })
pointsLedgerSchema.index({ user_id: 1, reason: 1, related_id: 1 })

export const PointsAccount = mongoose.model('PointsAccount', pointsAccountSchema)
export const PointsLedger = mongoose.model('PointsLedger', pointsLedgerSchema)
