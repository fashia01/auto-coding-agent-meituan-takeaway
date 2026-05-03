import mongoose from 'mongoose'

const Schema = mongoose.Schema

const activitySchema = new Schema({
  id: { type: Number, required: true, unique: true },
  type: { type: String, enum: ['flash_sale', 'time_discount', 'new_user_gift'], required: true },
  name: { type: String, required: true },
  restaurant_id: { type: Number, default: null },   // null = 平台活动
  start_at: { type: Date, required: true },
  end_at: { type: Date, required: true },
  // 秒杀专属
  total_stock: { type: Number, default: 0 },
  sold_count: { type: Number, default: 0 },
  // 关联优惠
  discount_type: { type: String, enum: ['fixed', 'percent', 'shipping'], required: true },
  threshold: { type: Number, default: 0 },
  value: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'active', 'ended'], default: 'active' },
  created_at: { type: Date, default: Date.now }
})

activitySchema.index({ status: 1, start_at: 1, end_at: 1 })
activitySchema.index({ restaurant_id: 1, end_at: 1 })

const Activity = mongoose.model('Activity', activitySchema)

export default Activity
