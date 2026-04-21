/**
 * seed-coupons.js — 预置优惠券模板并为测试用户发放
 *
 * 包含：
 *   - 5 种优惠券模板（平台满减/折扣/免配送费 + 店铺专属）
 *   - 为 user_id=1 的测试用户发放所有模板各一张
 *
 * 运行：
 *   npx babel-node seed-coupons.js
 */

/* eslint-disable no-console */
const mongoose = require('mongoose')

const DB_URL = 'mongodb://127.0.0.1:27017/takeaway'

const couponTemplateSchema = new mongoose.Schema({
  id: Number, type: String, name: String, discount_type: String,
  threshold: Number, value: Number, restaurant_id: Number,
  category: String, valid_days: Number, created_at: Date
})
const userCouponSchema = new mongoose.Schema({
  id: Number, user_id: Number, template_id: Number,
  status: String, expire_at: Date, used_order_id: Number,
  claimed_at: Date
})
const adminSchema = new mongoose.Schema({ id: Number, username: String })

const CouponTemplate = mongoose.model('CouponTemplate', couponTemplateSchema)
const UserCoupon = mongoose.model('UserCoupon', userCouponSchema)
const Admin = mongoose.model('Admin', adminSchema)

// ---- 5 种优惠券模板 ----
const TEMPLATES = [
  {
    id: 1001,
    type: 'platform',
    name: '平台券·满30减5',
    discount_type: 'fixed',
    threshold: 30,
    value: 5,
    restaurant_id: null,
    category: '',
    valid_days: 30
  },
  {
    id: 1002,
    type: 'platform',
    name: '平台券·满50减10',
    discount_type: 'fixed',
    threshold: 50,
    value: 10,
    restaurant_id: null,
    category: '',
    valid_days: 30
  },
  {
    id: 1003,
    type: 'platform',
    name: '新人专享·8折优惠',
    discount_type: 'percent',
    threshold: 0,
    value: 0.8,       // 即 8 折
    restaurant_id: null,
    category: '',
    valid_days: 7
  },
  {
    id: 1004,
    type: 'restaurant',
    name: '麦当劳专属·满20减3',
    discount_type: 'fixed',
    threshold: 20,
    value: 3,
    restaurant_id: 4,  // 麦当劳（东城万达店）的 id
    category: '',
    valid_days: 14
  },
  {
    id: 1005,
    type: 'platform',
    name: '免配送费券',
    discount_type: 'shipping',
    threshold: 0,
    value: 0,
    restaurant_id: null,
    category: '',
    valid_days: 7
  }
]

async function main () {
  await mongoose.connect(DB_URL)
  console.log('✅ MongoDB 连接成功')

  // 写入模板（upsert）
  console.log('\n📦 写入优惠券模板...')
  for (const tpl of TEMPLATES) {
    await CouponTemplate.findOneAndUpdate(
      { id: tpl.id },
      { ...tpl, created_at: new Date() },
      { upsert: true, new: true }
    )
    console.log(`  ✓ ${tpl.name}`)
  }

  // 找到测试用户（取第一个用户）
  const user = await Admin.findOne({}).sort({ id: 1 })
  if (!user) {
    console.log('⚠️  未找到任何用户，跳过发券步骤')
    await mongoose.disconnect()
    return
  }
  const user_id = user.id
  console.log(`\n🎫 为用户 id=${user_id} (${user.username || 'unknown'}) 发券...`)

  // 为测试用户发放所有模板各一张（已有的跳过）
  let baseId = 9000
  for (const tpl of TEMPLATES) {
    const existing = await UserCoupon.findOne({ user_id, template_id: tpl.id, status: 'unused' })
    if (existing) {
      console.log(`  - 跳过：已有 ${tpl.name}`)
      continue
    }
    const expireAt = new Date(Date.now() + tpl.valid_days * 24 * 3600 * 1000)
    await UserCoupon.create({
      id: baseId++,
      user_id,
      template_id: tpl.id,
      status: 'unused',
      expire_at: expireAt,
      claimed_at: new Date()
    })
    console.log(`  ✓ 发放：${tpl.name}（有效至 ${expireAt.toLocaleDateString()}）`)
  }

  console.log('\n✅ 优惠券种子数据写入完成！')
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('❌ 出错：', err)
  mongoose.disconnect()
})
