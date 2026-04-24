/* eslint-disable no-console */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getUserTasteProfile } from './taste';

import OpenAI from 'openai';
import FoodModel from '../../models/v1/foods';
import RestaurantModel from '../../models/v1/restaurant';
import CouponTemplate from '../../models/v1/coupon';

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
      return {
        promotions: templates.map(t => ({ id: t.id, name: t.name, type: t.discount_type, threshold: t.threshold, value: t.value })),
        summary: `当前可用优惠：${summaries.join('、')}`
      };
    } catch (err) {
      return { promotions: [], summary: '获取优惠信息失败' };
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
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ status: -1, message: 'messages 参数不能为空' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 获取用户口味画像，注入 systemPrompt
  const user_id = req.session && (req.session.admin_id || req.session.user_id)
  let tasteHint = ''
  if (user_id) {
    const { topTags, priceRange } = await getUserTasteProfile(String(user_id))
    if (topTags.length) {
      tasteHint = `\n\n## 用户口味偏好（来自历史订单分析）\n- 偏好标签：${topTags.join('、')}`
      if (priceRange && priceRange.avg) {
        tasteHint += `\n- 常用价格区间：${priceRange.min}~${priceRange.max}元，均价${priceRange.avg}元`
      }
      tasteHint += '\n在推荐时请优先考虑以上偏好，但也尊重用户当次的明确需求。'
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
- 如果没有找到菜品，诚实告知并建议换个描述${tasteHint}`
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

      sendEvent(res, { type: 'status', content: '正在为您分析需求并搜索菜品...' });

      const toolResult = await executeTool(toolCall.function.name, toolArgs);

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

      const { ranked, criteria } = toolResult;

      // 推送结构化菜品数据（仅推送已排序的 top_n 条）
      sendEvent(res, { type: 'foods', data: ranked });

      // 推送评判标准（前端可选展示）
      if (criteria) {
        sendEvent(res, { type: 'criteria', data: criteria });
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
