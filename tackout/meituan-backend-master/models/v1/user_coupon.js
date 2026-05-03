import mongoose from 'mongoose'

const Schema = mongoose.Schema;

// 用户已领取的优惠券实例
const userCouponSchema = new Schema({
  id: {type: Number, required: true, unique: true},
  user_id: {type: Number, required: true},           // 用户ID
  template_id: {type: Number, required: true},        // 对应的券模板ID
  status: {type: String, enum: ['unused', 'used', 'expired'], default: 'unused'},
  expire_at: {type: Date, required: true},            // 过期时间
  used_order_id: {type: Number, default: null},        // 使用时对应的订单ID
  source: {type: String, default: ''},                  // 来源标识，如 'new_user_gift'
  claimed_at: {type: Date, default: Date.now}
})

userCouponSchema.index({id: 1})
userCouponSchema.index({user_id: 1, status: 1})

const UserCoupon = mongoose.model('UserCoupon', userCouponSchema)

export default UserCoupon
