import mongoose from 'mongoose'

const Schema = mongoose.Schema;

// 优惠券模板（平台/商家创建的券定义）
const couponTemplateSchema = new Schema({
  id: {type: Number, required: true, unique: true},
  type: {type: String, enum: ['platform', 'restaurant'], default: 'platform'}, // 平台券/店铺专属券
  name: {type: String, required: true},           // 券名称，如"满30减5"
  discount_type: {type: String, enum: ['fixed', 'percent', 'shipping'], required: true},
  // fixed: 满减固定金额；percent: 折扣；shipping: 免配送费
  threshold: {type: Number, default: 0},          // 满多少可用（0表示无门槛）
  value: {type: Number, required: true},           // 减免金额（元）或折扣率（0.8=8折）
  restaurant_id: {type: Number, default: null},    // 仅店铺专属券填写
  category: {type: String, default: ''},           // 适用品类（空=全部）
  valid_days: {type: Number, default: 7},          // 领取后有效天数
  created_at: {type: Date, default: Date.now}
})

couponTemplateSchema.index({id: 1})

export const CouponTemplate = mongoose.model('CouponTemplate', couponTemplateSchema)

export default CouponTemplate
