/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getUserTasteProfile } from './taste';
import { writeTasteLog } from './taste';
import { getCommentSummary } from './comment';
import MessageModel from '../../models/v1/message';
import ActivityModel from '../../models/v1/activity';
import { PointsAccount } from '../../models/v1/points';

import OpenAI from 'openai';
import FoodModel from '../../models/v1/foods';
import RestaurantModel from '../../models/v1/restaurant';
import CouponTemplate from '../../models/v1/coupon';
import TasteLogModel from '../../models/v1/taste_log';

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
});

// -----------------------------------------------------------------------
// Tool 定义：search_and_rank_foods
// 关键升级：LLM 根据用户意图传入动态权重，后端执行标准化打分后返回 top_n 条
// -----------------------------------------------------------------------
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_and_rank_foods',
      description: `根据用户需求搜索并智能排序外卖菜品。

你需要：
1. 从用户的话中提取搜索关键词（如"汉堡"→keyword="汉堡"，"想吃辣的"→keyword="辣"）
2. 根据用户意图决定各维度的权重（所有权重之和不需要等于1，系统会自动归一化）：
   - price_weight：价格权重（越低越好）。用户强调"最便宜"、"实惠"时调高，如0.8；未提及价格时用0.1
   - sales_weight：销量权重（越高越好）。用户强调"热门"、"大家都爱吃"时调高；未提及时用0.3
   - score_weight：评分权重（越高越好）。用户强调"好评"、"评分高"时调高；未提及时用0.3
   - praise_weight：点赞数权重（越高越好）。用户强调"受欢迎"时调高；未提及时用0.2
3. 决定最终推荐数量 top_n：用户说"最便宜的一款"→1，"推荐几款"→3，未指定→3`,
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '菜品名称关键词，如"汉堡"、"辣"、"鸡"、"沙拉"、"面"、"饭"'
          },
          max_price: {
            type: 'number',
            description: '价格上限（元）。仅用于初步筛选候选集，如用户说"50元以内"则传50'
          },
          weights: {
            type: 'object',
            description: '各维度评分权重，根据用户意图动态设置',
            properties: {
              price_weight: {
                type: 'number',
                description: '价格维度权重，值越大表示越看重性价比（价格低得分高）。范围建议0.0~1.0'
              },
              sales_weight: {
                type: 'number',
                description: '月销量维度权重，值越大表示越看重热销程度。范围建议0.0~1.0'
              },
              score_weight: {
                type: 'number',
                description: '餐馆评分维度权重，值越大表示越看重口碑。范围建议0.0~1.0'
              },
              praise_weight: {
                type: 'number',
                description: '菜品点赞数维度权重，值越大表示越看重受欢迎程度。范围建议0.0~1.0'
              }
            }
          },
          top_n: {
            type: 'number',
            description: '最终推荐的菜品数量。用户说"最便宜的一款"传1，"推荐几款"传3，默认3，最多5'
          },
          reason: {
            type: 'string',
            description: '你对用户意图的判断和权重设置的理由，如"用户强调最便宜，价格权重设为0.9；同等价格下参考销量和评分"'
          }
        },
        required: ['weights', 'reason']
      }
    }
  },
  // 查询当前餐馆有效优惠活动
  {
    type: 'function',
    function: {
      name: 'get_active_promotions',
      description: '获取指定餐馆当前有效的优惠券和促销活动摘要，在推荐时告知用户可使用的优惠。',
      parameters: {
        type: 'object',
        properties: {
          restaurant_id: {
            type: 'number',
            description: '餐馆 ID，从 search_and_rank_foods 的结果中获取'
          }
        },
        required: ['restaurant_id']
      }
    }
  },
  // 购物车操作：加入购物车
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: `当用户明确表达要购买某道菜时（如"帮我加入购物车"、"就要这个"、"下单这个"）使用此工具。
仅在用户确认要购买时调用，不要在推荐阶段调用。
需要先通过 search_and_rank_foods 获取菜品信息，再调用此工具。`,
      parameters: {
        type: 'object',
        properties: {
          food_ids: {
            type: 'array',
            items: { type: 'number' },
            description: '要加入购物车的菜品 food_id 数组，来自 search_and_rank_foods 结果中的 food_id 字段'
          },
          quantities: {
            type: 'array',
            items: { type: 'number' },
            description: '与 food_ids 一一对应的数量数组，默认为1，用户说"两份"时填2'
          },
          force: {
            type: 'boolean',
            description: '是否强制覆盖跨店冲突，默认 false。用户确认清空购物车后再次调用时设为 true'
          }
        },
        required: ['food_ids', 'quantities']
      }
    }
  },
  // 购物车操作：清空购物车
  {
    type: 'function',
    function: {
      name: 'clear_cart',
      description: '当用户说"清空购物车"、"重新选"、"都不要了"时使用。清空当前购物车所有内容。',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  // 购物车操作：查看购物车
  {
    type: 'function',
    function: {
      name: 'view_cart',
      description: '当用户说"看看我购物车"、"购物车里有什么"时使用。触发前端展示当前购物车内容。',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  // 查询用户消息中心（未读消息摘要）
  {
    type: 'function',
    function: {
      name: 'get_my_messages',
      description: '当用户询问"我有什么消息"、"最近有什么通知"、"有没有新消息"时调用，返回最近未读消息摘要。',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '返回最近多少条消息，默认5条'
          }
        }
      }
    }
  },
  // 查询餐馆用户评价摘要
  {
    type: 'function',
    function: {
      name: 'get_restaurant_reviews',
      description: `获取指定餐馆的真实用户评价摘要。
在以下场景使用：
- 用户询问"这家店怎么样"、"评价好不好"、"口碑如何"
- 用户询问某类菜品体验，如"辣菜好吃吗"、"送得快不快"
- 推荐菜品后用户追问餐馆整体评价
不要在用户仅询问菜品推荐时调用此工具。`,
      parameters: {
        type: 'object',
        properties: {
          restaurant_id: {
            type: 'number',
            description: '餐馆 ID，从 search_and_rank_foods 结果中获取'
          },
          keyword: {
            type: 'string',
            description: '可选关键词过滤，如"辣度"、"分量"、"速度"。用户询问特定方面时填写'
          },
          limit: {
            type: 'number',
            description: '查询最近多少条评论，默认20'
          }
        },
        required: ['restaurant_id']
      }
    }
  },
  // 多人套餐规划
  {
    type: 'function',
    function: {
      name: 'plan_meal_combo',
      description: `当用户提到多人就餐、设定预算、说"点一桌菜"、"帮我们几个人点餐"等场景时使用此工具进行套餐规划。
与 search_and_rank_foods 的区别：
- search_and_rank_foods：单品推荐，适合"推荐一道菜"、"找个汉堡"
- plan_meal_combo：组合套餐，适合"4个人吃，预算150"、"点一桌菜，有人不吃辣"
调用前请确认已知晓用餐人数和预算上限。`,
      parameters: {
        type: 'object',
        properties: {
          restaurant_id: {
            type: 'number',
            description: '指定餐馆 ID（从对话上下文或 search_and_rank_foods 结果中获取）。如用户未指定餐馆则不传此参数（null）。'
          },
          headcount: {
            type: 'number',
            description: '用餐人数，如用户说"4个人"则传4。未指定时默认2。'
          },
          budget: {
            type: 'number',
            description: '总预算上限（元），如用户说"预算150"则传150。未指定时默认100。'
          },
          constraints: {
            type: 'array',
            items: { type: 'string' },
            description: '口味/饮食约束列表，如["至少一道不辣","有荤有素","不要海鲜"]。未指定约束时传空数组。'
          }
        },
        required: ['headcount', 'budget', 'constraints']
      }
    }
  }
];

// -----------------------------------------------------------------------
// 标准化打分与排序
// -----------------------------------------------------------------------
function scoreAndRank(candidates, weights, topN) {
  if (candidates.length === 0) return [];

  const { price_weight = 0.1, sales_weight = 0.3, score_weight = 0.3, praise_weight = 0.2 } = weights;

  // 归一化权重
  const totalW = price_weight + sales_weight + score_weight + praise_weight;
  const pw = totalW > 0 ? price_weight / totalW : 0.25;
  const sw = totalW > 0 ? sales_weight / totalW : 0.25;
  const ow = totalW > 0 ? score_weight / totalW : 0.25;
  const lw = totalW > 0 ? praise_weight / totalW : 0.25;

  // 收集各维度的 min/max 用于 min-max 归一化
  const prices = candidates.map(f => parseFloat(f.price) || 0).filter(v => v > 0);
  const sales = candidates.map(f => f.month_saled || 0);
  const scores = candidates.map(f => f.restaurant_score || 0);
  const praises = candidates.map(f => f.praise_num || 0);

  const minMax = (arr) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return { min, max, range: max - min || 1 };
  };

  const pMM = minMax(prices.length ? prices : [0]);
  const sMM = minMax(sales);
  const oMM = minMax(scores);
  const lMM = minMax(praises);

  const normalize = (val, { min, range }) => (val - min) / range;

  const scored = candidates.map(f => {
    const price = parseFloat(f.price) || 0;

    // 价格：越低越好，取反向归一化
    const priceScore = price > 0 ? 1 - normalize(price, pMM) : 0;
    const salesScore = normalize(f.month_saled || 0, sMM);
    const scoreScore = normalize(f.restaurant_score || 0, oMM);
    const praiseScore = normalize(f.praise_num || 0, lMM);

    const total = pw * priceScore + sw * salesScore + ow * scoreScore + lw * praiseScore;

    return {
      ...f,
      _scores: {
        price: Math.round(priceScore * 100),
        sales: Math.round(salesScore * 100),
        restaurant_score: Math.round(scoreScore * 100),
        praise: Math.round(praiseScore * 100),
        total: Math.round(total * 100)
      }
    };
  });

  return scored
    .sort((a, b) => b._scores.total - a._scores.total)
    .slice(0, Math.min(topN || 3, 5));
}

// -----------------------------------------------------------------------
// Tool 执行器
// -----------------------------------------------------------------------
async function executeTool(toolName, args) {
  // 查询餐馆有效优惠活动
  if (toolName === 'get_active_promotions') {
    const { restaurant_id } = args;
    try {
      const templates = await CouponTemplate.find({
        $or: [
          { type: 'platform' },
          { type: 'restaurant', restaurant_id: Number(restaurant_id) }
        ]
      }).lean();
      if (!templates.length) {
        return { promotions: [], summary: '该餐馆暂无可用优惠活动' };
      }
      const summaries = templates.map(t => {
        if (t.discount_type === 'fixed') return `满${t.threshold}减${t.value}元`
        if (t.discount_type === 'percent') return `${Math.round(t.value * 10)}折优惠`
        if (t.discount_type === 'shipping') return '免配送费'
        return t.name
      });
      // 查询当前有效活动（平台 + 该餐馆）
      let activitiesInfo = []
      try {
        const now = new Date()
        const actQuery = { start_at: { $lte: now }, end_at: { $gte: now } }
        if (restaurant_id) {
          actQuery.$or = [{ restaurant_id: null }, { restaurant_id: Number(restaurant_id) }]
        }
        const acts = await ActivityModel.find(actQuery).lean()
        activitiesInfo = acts.map(a => {
          const minutesLeft = Math.floor((new Date(a.end_at) - now) / 60000)
          const timeDesc = minutesLeft > 60 ? `${Math.floor(minutesLeft/60)}小时后结束` : `${minutesLeft}分钟后结束`
          if (a.type === 'flash_sale') {
            return `秒杀「${a.name}」剩余${a.total_stock - a.sold_count}份，${timeDesc}`
          }
          return `限时活动「${a.name}」，${timeDesc}`
        })
      } catch (e) { /* 静默 */ }


      // 查询用户积分余额
      let points_balance = 0
      let points_deductible = 0
      let pointsSummary = ''
      try {
        if (args._user_id) {
          const acc = await PointsAccount.findOne({ user_id: Number(args._user_id) }).lean()
          if (acc) {
            points_balance = acc.balance || 0
            // 假设订单金额未知，提示每100积分=1元
            points_deductible = Math.floor(points_balance / 100)
            if (points_balance > 0) {
              pointsSummary = `；您有 ${points_balance} 积分，可抵扣最多 ¥${points_deductible}`
            }
          }
        }
      } catch (e) { /* 静默 */ }

      return {
        promotions: templates.map(t => ({ id: t.id, name: t.name, type: t.discount_type, threshold: t.threshold, value: t.value })),
        points_balance,
        points_deductible,
        summary: `当前可用优惠：${summaries.join('、')}${activitiesInfo.length ? '；' + activitiesInfo.join('；') : ''}${pointsSummary}`
      };    } catch (err) {
      return { promotions: [], summary: '获取优惠信息失败' };
    }
  }

  // 购物车操作：查看购物车（前端响应型，后端只返回触发信号）
  if (toolName === 'view_cart') {
    return { action: 'view', message: '请查看当前购物车内容' };
  }

  // 购物车操作：清空购物车
  if (toolName === 'clear_cart') {
    return { action: 'clear', message: '已为您清空购物车' };
  }

  // 购物车操作：加入购物车
  if (toolName === 'add_to_cart') {
    const { food_ids = [], quantities = [], force = false } = args;
    try {
      // 从数据库查询菜品完整信息
      const foods = await FoodModel.find({ id: { $in: food_ids } }).lean();
      if (!foods.length) {
        return { action: 'add', success: false, message: '未找到对应菜品，请重新确认' };
      }
      // 查询关联餐馆信息
      const restaurantIds = [...new Set(foods.map(f => f.restaurant_id))];
      const restaurants = await RestaurantModel.find({ id: { $in: restaurantIds } }).lean();
      const restMap = {};
      restaurants.forEach(r => { restMap[r.id] = r; });

      // 构建加购 items
      const items = food_ids.map((fid, idx) => {
        const food = foods.find(f => f.id === Number(fid));
        if (!food) return null;
        const rest = restMap[food.restaurant_id] || {};
        return {
          food_id: food.id,
          name: food.name,
          price: food.skus && food.skus[0] ? food.skus[0].price : String(food.min_price),
          quantity: quantities[idx] || 1,
          restaurant_id: food.restaurant_id,
          restaurant_name: rest.name || '',
          restaurant_pic: rest.pic_url || '',
          pic_url: food.pic_url || ''
        };
      }).filter(Boolean);

      return {
        action: 'add',
        success: true,
        force,
        items,
        message: `已为您加入购物车：${items.map(i => `${i.name}×${i.quantity}`).join('、')}`
      };
    } catch (err) {
      return { action: 'add', success: false, message: '加购失败，请重试' };
    }
  }

  // ── get_my_messages：查询用户未读消息 ────────────────────────
  if (toolName === 'get_my_messages') {
    const { limit: msgLimit = 5 } = args
    try {
      // user_id 从调用方传入（aiChat 传递）
      const uid = args._user_id
      if (!uid) return { messages: [], summary: '请先登录后再查询消息' }
      const msgs = await MessageModel.find({ user_id: Number(uid), is_read: false })
        .sort({ created_at: -1 })
        .limit(Number(msgLimit))
        .lean()
      const total = await MessageModel.countDocuments({ user_id: Number(uid), is_read: false })
      if (!msgs.length) return { messages: [], total: 0, summary: '暂无未读消息' }
      const formatted = msgs.map(m => ({
        category: m.category,
        title: m.title,
        content: m.content,
        time: m.created_at
      }))
      return { messages: formatted, total, summary: `您有 ${total} 条未读消息` }
    } catch (err) {
      return { messages: [], summary: '获取消息失败' }
    }
  }

  // ── get_restaurant_reviews：查询餐馆评论摘要 ─────────────────
  if (toolName === 'get_restaurant_reviews') {
    const { restaurant_id, keyword, limit } = args
    if (!restaurant_id) return { error: '缺少 restaurant_id 参数' }
    try {
      return await getCommentSummary(restaurant_id, keyword, limit)
    } catch (err) {
      console.error('[AI] get_restaurant_reviews error:', err.message)
      return { error: '获取评论失败' }
    }
  }

  // ── plan_meal_combo：多人套餐规划 ────────────────────────────────────────
  if (toolName === 'plan_meal_combo') {
    const { restaurant_id, headcount = 2, budget = 100, constraints = [] } = args;

    try {
      // 1. 查询菜品候选列表（指定餐馆或全库 TOP 40）
      let foodQuery = {};
      if (restaurant_id) {
        foodQuery = { restaurant_id: Number(restaurant_id) };
      }
      const candidateFoods = await FoodModel.find(foodQuery)
        .sort({ month_saled: -1 })
        .limit(40)
        .lean();

      if (!candidateFoods.length) {
        return { error: '暂无可用菜品，请指定其他餐馆' };
      }

      // 查询餐馆信息
      const restIds = [...new Set(candidateFoods.map(f => f.restaurant_id))];
      const restaurants = await RestaurantModel.find({ id: { $in: restIds } }).lean();
      const restMap = {};
      restaurants.forEach(r => { restMap[r.id] = r; });

      // 构建菜品摘要列表（供 LLM 选择）
      const foodSummaries = candidateFoods.map(f => ({
        food_id: f.id,
        name: f.name,
        price: f.skus && f.skus[0] ? parseFloat(f.skus[0].price) : parseFloat(f.min_price) || 0,
        tag_list: f.tag_list || '',
        restaurant_id: f.restaurant_id
      })).filter(f => f.price > 0);

      // 2. 构造套餐规划 prompt 并调用 DeepSeek（非流式）
      const comboPrompt = `你是一个专业的外卖套餐规划助手。请根据以下信息为用户规划一份外卖套餐。

## 用餐信息
- 用餐人数：${headcount} 人
- 预算上限：${budget} 元
- 饮食约束：${constraints.length ? constraints.join('；') : '无特殊要求'}

## 可选菜品列表（JSON）
${JSON.stringify(foodSummaries, null, 2)}

## 要求
1. 从以上菜品中选出合适的套餐组合，确保总价 ≤ ${budget} 元
2. 菜品数量应与用餐人数匹配（通常 ${headcount} 人配 ${Math.max(3, headcount + 1)} 道菜）
3. 严格满足饮食约束（如"不辣"则不选 tag_list 含"辣"的菜品）
4. 荤素搭配合理，有主食、有菜

## 输出格式（只输出 JSON，不要有其他文字）
{"items":[{"food_id":数字,"qty":数量}],"reasoning":"规划说明，100字以内"}`;

      let llmResult = null;
      let retryCount = 0;

      while (retryCount <= 1) {
        const comboResponse = await openaiClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'deepseek-chat',
          messages: [{ role: 'user', content: comboPrompt }],
          stream: false
        });

        const rawContent = comboResponse.choices[0] && comboResponse.choices[0].message && comboResponse.choices[0].message.content;
        if (!rawContent) { retryCount++; continue; }

        // 解析 JSON（去掉可能的 markdown code fence）
        let parsed = null;
        try {
          const clean = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          parsed = JSON.parse(clean);
        } catch (e) {
          retryCount++;
          continue;
        }

        if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) {
          retryCount++;
          continue;
        }

        // 3. 程序硬性校验：从 DB 验证真实价格
        const planFoodIds = parsed.items.map(item => Number(item.food_id));
        const planFoods = await FoodModel.find({ id: { $in: planFoodIds } }).lean();
        const planFoodMap = {};
        planFoods.forEach(f => { planFoodMap[f.id] = f; });

        // 组装 items（含真实价格）
        let comboItems = parsed.items.map(item => {
          const f = planFoodMap[Number(item.food_id)];
          if (!f) return null;
          const price = f.skus && f.skus[0] ? parseFloat(f.skus[0].price) : parseFloat(f.min_price) || 0;
          return {
            food_id: f.id,
            name: f.name,
            qty: item.qty || 1,
            price,
            tag_list: f.tag_list || '',
            pic_url: f.pic_url || '',
            restaurant_id: f.restaurant_id
          };
        }).filter(Boolean);

        // 校验预算
        let totalPrice = comboItems.reduce((sum, item) => sum + item.price * item.qty, 0);

        // 超预算：替换最贵菜品（最多3次）
        let replaceCount = 0;
        while (totalPrice > budget && replaceCount < 3) {
          // 找最贵的那道菜
          comboItems.sort((a, b) => b.price * b.qty - a.price * a.qty);
          const expensive = comboItems[0];
          // 在候选中找同 restaurant_id 中更便宜的替代品
          const cheaper = foodSummaries
            .filter(fs => fs.restaurant_id === expensive.restaurant_id && fs.price < expensive.price && fs.food_id !== expensive.food_id)
            .sort((a, b) => b.price - a.price)[0];
          if (!cheaper) break;
          comboItems[0] = {
            food_id: cheaper.food_id,
            name: cheaper.name,
            qty: expensive.qty,
            price: cheaper.price,
            tag_list: cheaper.tag_list,
            pic_url: '',
            restaurant_id: cheaper.restaurant_id
          };
          totalPrice = comboItems.reduce((sum, item) => sum + item.price * item.qty, 0);
          replaceCount++;
        }

        // 校验口味约束（检查"不辣"类约束）
        const noSpicy = constraints.some(c => c.includes('不辣') || c.includes('不要辣'));
        const constraintsMet = {};
        if (noSpicy) {
          const hasNonSpicy = comboItems.some(item => !item.tag_list.includes('辣'));
          constraintsMet.no_spicy = hasNonSpicy;
          // 若无非辣菜品，重试一次
          if (!hasNonSpicy && retryCount < 1) {
            retryCount++;
            continue;
          }
        }
        constraintsMet.budget = totalPrice <= budget;

        // 4. 补充 pic_url（从 DB 已查到的完整 food 信息）
        comboItems = comboItems.map(item => {
          const f = planFoodMap[item.food_id];
          return { ...item, pic_url: (f && f.pic_url) || '' };
        });

        // 5. 确定餐馆信息
        const mainRestId = comboItems[0] && comboItems[0].restaurant_id;
        const mainRest = restMap[mainRestId] || {};

        llmResult = {
          restaurant_id: mainRestId || null,
          restaurant_name: mainRest.name || '精选餐馆',
          items: comboItems,
          total_price: Math.round(totalPrice * 100) / 100,
          reasoning: parsed.reasoning || `为 ${headcount} 人规划的套餐，共 ${comboItems.length} 道菜`,
          constraints_met: constraintsMet
        };
        break;
      }

      if (!llmResult) {
        return { error: '套餐规划失败，请稍后重试或调整预算/约束' };
      }

      return llmResult;
    } catch (err) {
      console.error('[AI] plan_meal_combo error:', err.message);
      return { error: '套餐规划出错，请重试' };
    }
  }

  if (toolName !== 'search_and_rank_foods') return { ranked: [], criteria: null };

  const { keyword, max_price, weights = {}, top_n = 3, reason = '' } = args;
  const query = {};

  if (keyword) {
    query['$or'] = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { tag_list: { $regex: keyword, $options: 'i' } }
    ];
  }

  if (max_price) {
    query['min_price'] = { $lte: max_price, $gt: 0 };
  }

  // 拉取更多候选供打分（最多 20 条）
  let foods;
  try {
    foods = await FoodModel.find(query).limit(20).lean();
  } catch (err) {
    console.error('[AI] MongoDB query error:', err.message);
    return { ranked: [], criteria: null };
  }

  // 补充餐馆信息
  const candidates = [];
  for (const food of foods) {
    if (!food.skus || food.skus.length === 0) continue;

    let restaurant = null;
    try {
      restaurant = await RestaurantModel.findOne({ id: food.restaurant_id }).lean();
    } catch (err) {
      console.error('[AI] Restaurant lookup error:', err.message);
    }

    candidates.push({
      food_id: food.skus[0].id,
      food_name: food.name,
      description: food.description || '',
      price: food.skus[0].price,
      pic_url: food.pic_url || '',
      restaurant_id: food.restaurant_id,
      restaurant_name: restaurant ? restaurant.name : '未知餐馆',
      restaurant_pic: restaurant ? restaurant.pic_url : '',
      restaurant_score: restaurant ? (restaurant.wm_poi_score || 0) : 0,
      month_saled: food.month_saled || 0,
      praise_num: food.praise_num || 0
    });
  }

  // 打分排序，取 top_n
  const ranked = scoreAndRank(candidates, weights, top_n);

  // 构建评判标准说明（传给 LLM 和前端）
  const totalW = (weights.price_weight || 0.1) + (weights.sales_weight || 0.3) +
                 (weights.score_weight || 0.3) + (weights.praise_weight || 0.2);
  const criteria = {
    reason,
    candidate_count: candidates.length,
    top_n,
    weights: {
      price: `${Math.round((weights.price_weight || 0.1) / totalW * 100)}%（价格越低越好）`,
      sales: `${Math.round((weights.sales_weight || 0.3) / totalW * 100)}%（月销量越高越好）`,
      restaurant_score: `${Math.round((weights.score_weight || 0.3) / totalW * 100)}%（餐馆评分越高越好）`,
      praise: `${Math.round((weights.praise_weight || 0.2) / totalW * 100)}%（点赞数越高越好）`
    }
  };

  return { ranked, criteria };
}

// -----------------------------------------------------------------------
// SSE 辅助
// -----------------------------------------------------------------------
function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// -----------------------------------------------------------------------
// 主控制器：POST /v1/ai/chat
// -----------------------------------------------------------------------
export async function aiChat(req, res) {
  const { messages, rejected_food_ids, push_context } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ status: -1, message: 'messages 参数不能为空' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 当前用户 ID（统一声明，供后续口味画像和负信号使用）
  const user_id = req.session && (req.session.admin_id || req.session.user_id)

  // 处理被拒绝的菜品 ID：写入 ai_rejected 负信号
  if (user_id && rejected_food_ids && rejected_food_ids.length) {
    try {
      const rejectedFoods = await FoodModel.find({ id: { $in: rejected_food_ids } }).lean()
      const tagSet = new Set()
      rejectedFoods.forEach(f => {
        if (f.tag_list) f.tag_list.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t))
      })
      const tags = [...tagSet]
      if (tags.length) writeTasteLog(String(user_id), tags, null, null, 'ai_rejected')
    } catch (e) { /* 静默 */ }
  }

  // 获取用户口味画像，注入 systemPrompt
  let tasteHint = ''
  if (user_id) {
    // 获取最近3条 TasteLog 作为近期口味上下文
    const recentLogs = await TasteLogModel.find({ user_id: String(user_id) })
      .sort({ created_at: -1 }).limit(3).lean()
      .catch(() => [])
    const recentTags = recentLogs.flatMap(l => l.food_tags || [])

    const { topTags, excludeTags, priceRange } = await getUserTasteProfile(String(user_id), 5, { recentTags })
    if (topTags.length) {
      tasteHint = `\n\n## 用户口味偏好（来自历史订单分析）\n- 偏好标签：${topTags.join('、')}`
      if (priceRange && priceRange.avg) {
        tasteHint += `\n- 常用价格区间：${priceRange.min}~${priceRange.max}元，均价${priceRange.avg}元`
      }
      tasteHint += '\n在推荐时请优先考虑以上偏好，但也尊重用户当次的明确需求。'
    }
    if (excludeTags && excludeTags.length) {
      tasteHint += `\n- 用户不喜欢（请避免推荐含以下标签的菜品）：${excludeTags.join('、')}`
    }
  }

  const systemPrompt = {
    role: 'system',
    content: `你是一个专业的外卖智能推荐助手。

## 工作流程
当用户想点餐时，调用 search_and_rank_foods 工具：
1. 分析用户意图，提取关键词和价格限制
2. 根据用户强调的偏好设置权重（如"最便宜"→价格权重调高，"最受欢迎"→销量权重调高）
3. 用 reason 字段说明你的判断逻辑

## 回复格式要求
在系统返回排序结果后，你的回复必须包含以下两部分：

**第一部分：推荐结论**（根据 top_n 决定数量，不要自行增减）
直接介绍排名靠前的菜品特点，语气自然友好。

**第二部分：本次推荐评判标准**
用简洁的格式说明评判标准，例如：
> 📊 本次推荐评判标准：价格优先（权重60%）> 月销量（25%）> 餐馆评分（15%）
> 从 {N} 款候选菜品中，综合打分后推荐排名最高的 {top_n} 款
> 💡 如需调整，可以告诉我你的偏好，例如"我更在意评分"或"销量高一点也行"

## 重要约束
- 推荐数量严格遵守 top_n，不要自行增加
- 每次都要在末尾输出评判标准说明
- 如果没有找到菜品，诚实告知并建议换个描述

## 购物车操作工具使用规则
- **add_to_cart**：仅当用户明确说"加入购物车"、"就要这个"、"下单这个"、"帮我点这个"时才调用。推荐阶段绝对不要调用。调用时使用 search_and_rank_foods 结果中的 food_id 字段。
- **clear_cart**：用户说"清空购物车"、"重新来"、"都不要了"时调用。
- **view_cart**：用户说"看看购物车"、"购物车里有什么"时调用。
- 若用户说"换一家店的菜"但购物车有其他店菜品，先提示用户确认清空，用户说"确认"后再调用 add_to_cart（force=true）。

## 评价查询工具使用规则（get_restaurant_reviews）
- 当用户询问"这家店怎么样"、"评价好不好"、"口碑如何"、"某菜品好不好吃"、"送餐速度怎样"时调用
- 推荐菜品后用户追问餐馆整体评价时也可调用
- 需要 restaurant_id，从 search_and_rank_foods 结果中获取
- 用户询问特定方面时填写 keyword（如"辣度"/"分量"/"速度"）

## 消息查询工具使用规则（get_my_messages）
- 当用户询问"我有什么消息"、"最近有什么通知"、"有没有新消息"时调用
- 无需任何参数，直接调用即可

## 套餐规划工具使用规则（plan_meal_combo）
- 当用户提到**多人就餐**（如"我们4个人"、"一桌菜"）、**设定预算**（如"预算150"）、或说"帮我们点餐"时，优先使用 plan_meal_combo。
- **plan_meal_combo vs search_and_rank_foods 区分**：
  - 单人、找某类菜品 → search_and_rank_foods
  - 多人就餐、需要组合方案、提到预算上限 → plan_meal_combo
- 收到 plan_meal_combo 结果后，自然介绍套餐亮点，说明荤素搭配和口味，鼓励用户点击"全部加入购物车"。
- 若用户说"去掉那道汤"、"换一道菜"，理解为对上次套餐的修改，重新调用 plan_meal_combo 并在 constraints 中加入修改说明。${tasteHint}${push_context ? `\n\n## 本次对话背景（主动推送触发）\n${push_context}` : ''}`
  };

  try {
    const firstResponse = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'deepseek-chat',
      messages: [systemPrompt, ...messages],
      tools,
      stream: false
    });

    const choice = firstResponse.choices[0];

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      let toolArgs;
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        toolArgs = {};
      }

      sendEvent(res, { type: 'status', content: toolCall.function.name === 'plan_meal_combo' ? '正在为您规划套餐方案...' : '正在为您分析需求并搜索菜品...' });

      const toolResult = await executeTool(toolCall.function.name, { ...toolArgs, _user_id: user_id });

      // 购物车操作工具处理（add_to_cart / clear_cart / view_cart）
      const cartTools = new Set(['add_to_cart', 'clear_cart', 'view_cart']);
      if (cartTools.has(toolCall.function.name)) {
        // 发送购物车操作事件给前端
        sendEvent(res, { type: 'cart_action', data: toolResult });
        // 将操作结果告知 LLM，让它生成自然语言确认
        const toolResultMsg = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        };
        const cartResponse = await openaiClient.chat.completions.create({
          model: 'deepseek-chat',
          stream: true,
          messages: [systemPrompt, ...messages, choice.message, toolResultMsg]
        });
        for await (const chunk of cartResponse) {
          const c0 = chunk.choices && chunk.choices[0];
          const delta = c0 && c0.delta && c0.delta.content;
          if (delta) sendEvent(res, { type: 'text', content: delta });
        }
        sendEvent(res, { type: 'done' });
        res.end();
        return;
      }

      // get_active_promotions 结果单独处理
      if (toolCall.function.name === 'get_active_promotions') {
        const toolResultContent = JSON.stringify(toolResult);
        const toolResultMsg = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResultContent
        };
        const secondResponse = await openaiClient.chat.completions.create({
          model: 'deepseek-chat',
          stream: true,
          messages: [systemPrompt, ...messages, choice.message, toolResultMsg]
        });
        for await (const chunk of secondResponse) {
          const choice0 = chunk.choices && chunk.choices[0];
          const delta = choice0 && choice0.delta && choice0.delta.content;
          if (delta) sendEvent(res, { type: 'text', content: delta });
        }
        sendEvent(res, { type: 'done' });
        res.end();
        return;
      }

      // get_my_messages：用户消息摘要
      if (toolCall.function.name === 'get_my_messages') {
        const msgsResultMsg = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        }
        const msgsStream = await openaiClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'deepseek-chat',
          stream: true,
          messages: [systemPrompt, ...messages, choice.message, msgsResultMsg]
        })
        for await (const chunk of msgsStream) {
          const c0 = chunk.choices && chunk.choices[0]
          const delta = c0 && c0.delta && c0.delta.content
          if (delta) sendEvent(res, { type: 'text', content: delta })
        }
        sendEvent(res, { type: 'done' })
        res.end()
        return
      }

      // get_restaurant_reviews：评论摘要结果
      if (toolCall.function.name === 'get_restaurant_reviews') {
        if (toolResult.error) {
          sendEvent(res, { type: 'text', content: `获取评价失败：${toolResult.error}` });
        } else {
          // 发送 review 事件给前端渲染 ReviewSummaryCard
          sendEvent(res, { type: 'review', data: toolResult });
          // LLM 基于评价数据生成自然语言口碑介绍
          const reviewResultMsg = {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              restaurant_name: toolResult.restaurant_name,
              avg_scores: toolResult.avg_scores,
              total_count: toolResult.total_count,
              summary_text: toolResult.summary_text,
              sample_comments: toolResult.samples
            })
          };
          const reviewTextStream = await openaiClient.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'deepseek-chat',
            stream: true,
            messages: [systemPrompt, ...messages, choice.message, reviewResultMsg]
          });
          for await (const chunk of reviewTextStream) {
            const c0 = chunk.choices && chunk.choices[0];
            const delta = c0 && c0.delta && c0.delta.content;
            if (delta) sendEvent(res, { type: 'text', content: delta });
          }
        }
        sendEvent(res, { type: 'done' });
        res.end();
        return;
      }

      // plan_meal_combo：套餐规划结果
      if (toolCall.function.name === 'plan_meal_combo') {
        if (toolResult.error) {
          // 规划失败，直接用文字回复
          sendEvent(res, { type: 'text', content: toolResult.error });
        } else {
          // 发送 combo 事件给前端渲染 ComboCard
          sendEvent(res, { type: 'combo', data: toolResult });
          // 再让 LLM 用自然语言介绍套餐
          const comboResultMsg = {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: true,
              restaurant_name: toolResult.restaurant_name,
              items: toolResult.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
              total_price: toolResult.total_price,
              reasoning: toolResult.reasoning,
              constraints_met: toolResult.constraints_met
            })
          };
          const comboTextStream = await openaiClient.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'deepseek-chat',
            stream: true,
            messages: [systemPrompt, ...messages, choice.message, comboResultMsg]
          });
          for await (const chunk of comboTextStream) {
            const c0 = chunk.choices && chunk.choices[0];
            const delta = c0 && c0.delta && c0.delta.content;
            if (delta) sendEvent(res, { type: 'text', content: delta });
          }
        }
        sendEvent(res, { type: 'done' });
        res.end();
        return;
      }

      const { ranked, criteria } = toolResult;

      // 推送结构化菜品数据（仅推送已排序的 top_n 条）
      sendEvent(res, { type: 'foods', data: ranked });

      // 推送评判标准（前端可选展示）
      if (criteria) {
        sendEvent(res, { type: 'criteria', data: criteria });
      }

      // 推送菜品 ID 上下文（前端追加到 assistant content，让下轮对话 AI 可见 food_id）
      if (ranked.length > 0) {
        const idCtx = ranked.map(f => `${f.food_name}(id:${f.food_id})`).join('、');
        sendEvent(res, { type: 'food_ids_ctx', content: `\n\n<!-- 推荐菜品ID：${idCtx} -->` });
      }

      // 第二轮：携带完整结果流式生成推荐文案
      const toolResultContent = JSON.stringify({
        ranked_foods: ranked.length > 0 ? ranked : null,
        message: ranked.length === 0 ? '未找到符合条件的菜品' : null,
        criteria
      });

      const toolResultMsg = {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResultContent
      };

      const secondStream = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'deepseek-chat',
        messages: [systemPrompt, ...messages, choice.message, toolResultMsg],
        stream: true
      });

      for await (const chunk of secondStream) {
        const delta = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if (delta) {
          sendEvent(res, { type: 'text', content: delta });
        }
      }

    } else {
      // 普通对话分支
      const stream = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'deepseek-chat',
        messages: [systemPrompt, ...messages],
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if (delta) {
          sendEvent(res, { type: 'text', content: delta });
        }
      }
    }

    sendEvent(res, { type: 'done' });
    res.end();

  } catch (err) {
    console.error('[AI] aiChat error:', err.message);
    try {
      sendEvent(res, { type: 'error', content: '服务暂时不可用，请稍后重试' });
      sendEvent(res, { type: 'done' });
    } catch (_) { /* 连接可能已断开 */ }
    res.end();
  }
}

export default { aiChat };
