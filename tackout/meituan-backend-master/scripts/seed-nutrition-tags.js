/**
 * seed-nutrition-tags.js — LLM 批量为菜品打营养/过敏原标签
 * 运行：cd meituan-backend-master && npx babel-node scripts/seed-nutrition-tags.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import OpenAI from 'openai'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import Foods from '../models/v1/foods'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/takeaway'
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1'
})

const BATCH_SIZE = 20
const DELAY_MS = 1500

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function inferNutritionTags(foodNames) {
  const prompt = `你是一个营养分析助手。对以下外卖菜品，估算营养信息并以JSON数组返回。

菜品列表：
${foodNames.map((n, i) => `${i+1}. ${n}`).join('\n')}

对每道菜返回一个对象，包含：
- name: 菜品原名（完全一致）
- calories_per_100g: 每100克估算热量（kcal，整数，无法判断则返回null）
- allergens: 可能含有的过敏原数组（从以下选择：["花生","虾","蟹","奶制品","鸡蛋","小麦","大豆","鱼","芝麻","坚果"]）
- diet_tags: 饮食标签数组（从以下选择：["轻食","素食","低碳","高蛋白","辣","重口","清淡","汤类","主食"]）

只返回JSON数组，不要任何解释。`

  const resp = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    stream: false,
    temperature: 0.3
  })

  const raw = resp.choices[0].message.content.trim()
  // 提取 JSON 数组
  const match = raw.match(/\[[\s\S]+]/)
  if (!match) throw new Error('LLM 未返回 JSON 数组: ' + raw.slice(0, 100))
  return JSON.parse(match[0])
}

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('MongoDB connected')

  // 查找没有 nutrition_tags 或 nutrition_tags.allergens 为空的菜品
  const foods = await Foods.find({
    $or: [
      { 'nutrition_tags.allergens': { $exists: false } },
      { 'nutrition_tags.allergens': { $size: 0 } },
      { nutrition_tags: null }
    ]
  }).select('id name').lean()

  console.log(`待处理菜品数: ${foods.length}`)
  let processed = 0
  let failed = 0

  for (let i = 0; i < foods.length; i += BATCH_SIZE) {
    const batch = foods.slice(i, i + BATCH_SIZE)
    const names = batch.map(f => f.name)
    console.log(`\n处理第 ${i+1}~${Math.min(i+BATCH_SIZE, foods.length)} 条...`)

    try {
      const results = await inferNutritionTags(names)
      const resultMap = {}
      results.forEach(r => { resultMap[r.name] = r })

      // 批量更新
      const bulkOps = batch.map(food => {
        const r = resultMap[food.name]
        if (!r) return null
        return {
          updateOne: {
            filter: { id: food.id },
            update: {
              $set: {
                'nutrition_tags.calories_per_100g': r.calories_per_100g || null,
                'nutrition_tags.allergens': Array.isArray(r.allergens) ? r.allergens : [],
                'nutrition_tags.diet_tags': Array.isArray(r.diet_tags) ? r.diet_tags : []
              }
            }
          }
        }
      }).filter(Boolean)

      if (bulkOps.length) await Foods.bulkWrite(bulkOps)
      processed += bulkOps.length
      console.log(`  ✅ 本批更新 ${bulkOps.length} 条，累计 ${processed}/${foods.length}`)
    } catch (err) {
      console.error(`  ❌ 批次失败: ${err.message}`)
      failed += batch.length
    }

    if (i + BATCH_SIZE < foods.length) await sleep(DELAY_MS)
  }

  console.log(`\n完成！成功 ${processed}，失败 ${failed}`)
  await mongoose.disconnect()
}

seed().catch(e => { console.error(e); process.exit(1) })
