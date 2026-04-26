/**
 * backfill-food-tags.js — 批量为无标签菜品推断 tag_list
 *
 * 使用 DeepSeek API 批量推断菜品标签（每批20道），
 * 写回数据库 foods.tag_list 字段。
 *
 * 运行：node scripts/backfill-food-tags.js
 * 可重复运行（增量处理，已有标签的不重复处理）
 */

/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const https = require('https');

const DB_URL = 'mongodb://127.0.0.1:27017/takeaway';
const API_KEY = process.env.OPENAI_API_KEY;
const API_BASE = (process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
const BATCH_SIZE = 20;

// 标签格式校验：逗号分隔、单标签≤5汉字、总数1-8个
function validateTags(tagStr) {
  if (!tagStr || typeof tagStr !== 'string') return false;
  const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length < 1 || tags.length > 8) return false;
  return tags.every(t => t.length >= 1 && t.length <= 5);
}

// 从菜名提取兜底标签
function fallbackTags(name) {
  const keywords = {
    '牛肉': '牛肉', '猪肉': '猪肉', '鸡肉': '鸡肉', '鸡': '鸡肉',
    '羊肉': '羊肉', '鱼': '鱼类', '虾': '虾类', '蟹': '海鲜',
    '辣': '辣', '麻辣': '麻辣', '酸': '酸', '甜': '甜',
    '炒': '炒菜', '汤': '汤类', '粥': '粥', '面': '面食',
    '饭': '米饭', '饺': '饺子', '包': '包子', '饼': '饼类',
    '火锅': '火锅', '烤': '烤类', '炸': '炸类',
    '蔬菜': '素菜', '豆腐': '豆腐', '蛋': '蛋类',
    '套餐': '套餐', '沙拉': '沙拉', '甜品': '甜品', '饮料': '饮料'
  };
  const found = [];
  for (const [key, tag] of Object.entries(keywords)) {
    if (name.includes(key) && !found.includes(tag)) found.push(tag);
    if (found.length >= 3) break;
  }
  return found.length ? found.join(',') : '中餐';
}

// 调用 DeepSeek API
function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });
    const url = new URL(API_BASE + '/chat/completions');
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
          resolve(content || '');
        } catch (e) { reject(new Error('parse error: ' + data.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// 批量推断标签
async function inferTagsBatch(foods) {
  const list = foods.map(f => ({ id: f.id, name: f.name }));
  const prompt = `你是一个中餐菜品分类专家。请为以下菜品提供1-6个描述性标签。
标签要求：中文，逗号分隔，单个标签1-5个汉字，侧重口味(辣/甜/咸/清淡)、食材(牛肉/鸡肉/素菜)、菜系(川菜/粤菜/湘菜)、场景(早餐/下饭/宵夜)。

菜品列表：
${JSON.stringify(list)}

请以JSON格式返回，只返回JSON不要有其他内容：
[{"id":数字,"tags":"标签1,标签2,..."}]`;

  try {
    const content = await callDeepSeek(prompt);
    // 提取 JSON 部分
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('no JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log('  ⚠️  批次推断失败:', e.message.slice(0, 100));
    return [];
  }
}

async function main() {
  await mongoose.connect(DB_URL);
  console.log('✅ MongoDB 连接成功');

  const Food = mongoose.model('Foods', new mongoose.Schema({
    id: Number, name: String, tag_list: String
  }));

  // 查询所有无标签菜品
  const noTagFoods = await Food.find({
    $or: [{ tag_list: null }, { tag_list: '' }, { tag_list: 'undefined' }]
  }, 'id name tag_list').lean();

  console.log(`\n📦 共 ${noTagFoods.length} 道菜品需要补全标签`);

  if (!noTagFoods.length) {
    console.log('✅ 所有菜品已有标签，无需处理');
    await mongoose.disconnect();
    return;
  }

  if (!API_KEY) {
    console.log('⚠️  未设置 OPENAI_API_KEY，使用菜名关键词兜底');
    let count = 0;
    for (const f of noTagFoods) {
      const tags = fallbackTags(f.name);
      await Food.updateOne({ id: f.id }, { $set: { tag_list: tags } });
      count++;
    }
    console.log(`✅ 兜底处理完成：${count} 道菜品`);
    await mongoose.disconnect();
    return;
  }

  let success = 0, fallback = 0;

  // 分批处理
  for (let i = 0; i < noTagFoods.length; i += BATCH_SIZE) {
    const batch = noTagFoods.slice(i, i + BATCH_SIZE);
    console.log(`\n处理第 ${i + 1}-${Math.min(i + BATCH_SIZE, noTagFoods.length)} / ${noTagFoods.length} 道...`);

    const results = await inferTagsBatch(batch);
    const resultMap = {};
    results.forEach(r => { resultMap[r.id] = r.tags; });

    for (const food of batch) {
      let tags = resultMap[food.id];
      if (tags && validateTags(tags)) {
        await Food.updateOne({ id: food.id }, { $set: { tag_list: tags } });
        console.log(`  ✓ [${food.id}] ${food.name}: ${tags}`);
        success++;
      } else {
        // 兜底
        tags = fallbackTags(food.name);
        await Food.updateOne({ id: food.id }, { $set: { tag_list: tags } });
        console.log(`  ~ [${food.id}] ${food.name}: ${tags} (兜底)`);
        fallback++;
      }
    }

    // 批次间稍作停顿，避免 API 限流
    if (i + BATCH_SIZE < noTagFoods.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const totalTagged = await Food.countDocuments({ tag_list: { $nin: [null, '', 'undefined'] } });
  const total = await Food.countDocuments();

  console.log(`\n📊 处理完成：AI推断 ${success} 道，兜底 ${fallback} 道`);
  console.log(`📊 标签覆盖率：${totalTagged}/${total} (${(totalTagged/total*100).toFixed(1)}%)`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ 出错：', err);
  mongoose.disconnect();
  process.exit(1);
});
