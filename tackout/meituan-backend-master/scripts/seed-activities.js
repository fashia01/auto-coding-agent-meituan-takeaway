/**
 * seed-activities.js — 写入测试营销活动数据
 * 运行：cd meituan-backend-master && npx babel-node scripts/seed-activities.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import Activity from '../models/v1/activity'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/takeaway'

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB connected')

  // 清理旧活动
  await Activity.deleteMany({})

  const now = new Date()
  const activities = [
    // 1. 限时秒杀：麻辣烫，库存5份，今天有效
    {
      id: 3001,
      type: 'flash_sale',
      name: '🔥 麻辣烫限时5折秒杀',
      restaurant_id: 43,
      start_at: new Date(now.getTime() - 3600000),    // 1小时前开始
      end_at: new Date(now.getTime() + 7 * 3600000),  // 7小时后结束
      total_stock: 5,
      sold_count: 0,
      discount_type: 'percent',
      threshold: 0,
      value: 0.5,
      status: 'active'
    },
    // 2. 限时满减：平台活动，3天有效
    {
      id: 3002,
      type: 'time_discount',
      name: '⚡ 限时特惠·满30减12',
      restaurant_id: null,   // 平台活动，全部餐馆适用
      start_at: new Date(now.getTime() - 86400000),           // 昨天开始
      end_at: new Date(now.getTime() + 2 * 86400000),         // 2天后结束
      total_stock: 0,
      sold_count: 0,
      discount_type: 'fixed',
      threshold: 30,
      value: 12,
      status: 'active'
    },
    // 3. 必胜客专属限时活动
    {
      id: 3003,
      type: 'time_discount',
      name: '🍕 必胜客周末特惠·满50减20',
      restaurant_id: 37,
      start_at: new Date(now.getTime() - 3600000),
      end_at: new Date(now.getTime() + 48 * 3600000),
      total_stock: 0,
      sold_count: 0,
      discount_type: 'fixed',
      threshold: 50,
      value: 20,
      status: 'active'
    },
    // 4. 已过期活动（用于测试过期过滤）
    {
      id: 3004,
      type: 'time_discount',
      name: '已过期活动（不应显示）',
      restaurant_id: null,
      start_at: new Date(now.getTime() - 7 * 86400000),
      end_at: new Date(now.getTime() - 86400000),
      total_stock: 0,
      sold_count: 0,
      discount_type: 'fixed',
      threshold: 20,
      value: 5,
      status: 'ended'
    }
  ]

  await Activity.insertMany(activities.map(a => ({ ...a, created_at: new Date() })))
  console.log(`✅ 写入 ${activities.length} 条活动（其中1条已过期）`)

  await mongoose.disconnect()
  console.log('完成！')
}

seed().catch(e => { console.error(e); process.exit(1) })
