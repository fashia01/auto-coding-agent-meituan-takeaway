import BaseClass from '../../prototype/baseClass'
import AdminModel from '../../models/admin/admin';
import OrderModel from '../../models/v1/order'
import CommentModel from '../../models/v1/comment'
import RestaurantModel from '../../models/v1/restaurant'
import { writeTasteLog } from './taste'
import moment from 'moment';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ── 评论摘要内存缓存 ─────────────────────────────────────────
// Map<key, { data, expireAt }>
const summaryCache = new Map()
const CACHE_TTL = 60 * 60 * 1000  // 1小时

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
})

class Comment extends BaseClass {
  constructor() {
    super();
    this.makeComment = this.makeComment.bind(this);
    this.getCommentSummaryRoute = this.getCommentSummaryRoute.bind(this);
  }

  //评论
  async makeComment(req, res, next) {
    let {order_id, comment_data, food_score = 0, delivery_score = 0, quality_score = 0, pic_url = []} = req.body;
    if (!order_id || !comment_data) {
      res.send({
        status: -1,
        message: '评论失败，参数有误'
      });
      return;
    }
    try {
      let order = await OrderModel.findOne({id: order_id}, '-_id').populate([
        {path: 'restaurant'}, {path: 'user_id'}]);

      //判断订单能否评价
      let user = await AdminModel.findOne({id: order.user_id.id});
      let user_id = req.session.admin_id || req.session.user_id;
      if (user.id !== user_id || order.code !== 200) {
        res.send({
          status: -1,
          message: '评价失败，该订单不能评论!'
        });
        return;
      }
      console.log('user', user);
      let comment_id = await this.getId('comment_id');
      // 处理 pic_url：可能是字符串或数组
      let parsedPicUrl = [];
      if (pic_url) {
        if (typeof pic_url === 'string') {
          parsedPicUrl = JSON.parse(pic_url);
        } else if (Array.isArray(pic_url)) {
          parsedPicUrl = pic_url;
        }
      }
      let data = {
        user_id,
        id: comment_id,
        user_name: user.username,
        avatar: user.avatar,
        restaurant_id: order.restaurant.id,
        restaurant: order.restaurant._id,
        pic_url: parsedPicUrl,
        comment_data,
        order_id,
        food_score,
        delivery_score
      };
      console.log('data', data);
      let comment = await new CommentModel(data).save();
      /*修改商品评分begin*/
      let restaurant = order.restaurant;
      let comment_number = Number(restaurant.comment_number) || 0;  // 防御 undefined/NaN
      restaurant.wm_poi_score = ((restaurant.wm_poi_score * comment_number + food_score ) / (comment_number + 1)).toFixed(1);
      restaurant.delivery_score = ((restaurant.delivery_score * comment_number + delivery_score) / (comment_number + 1)).toFixed(1);
      restaurant.comment_number = comment_number + 1;
      await restaurant.save();
      /*修改商品评分end*/
      /* order.has_comment =  !order.has_comment;
       await order.save();*/
      await OrderModel.updateOne({id: order_id}, {has_comment: true});

      // 评分信号：提取菜品标签和价格区间（高分正信号 / 低分负信号）
      const foods = order.foods || []
      const tagSet = new Set()
      const prices = []
      foods.forEach(f => {
        if (f.tag_list) {
          f.tag_list.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t))
        }
        if (f.price) prices.push(Number(f.price))
      })
      const tags = [...tagSet]
      const priceRange = prices.length ? {
        min: Math.min(...prices), max: Math.max(...prices),
        avg: +(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
      } : null

      if (food_score >= 4) {
        // 高评分：正面信号
        writeTasteLog(user_id, tags, priceRange, order.restaurant.id, 'high_rating')
      } else if (food_score <= 2 && food_score > 0) {
        // 低评分（1-2星）：负面信号
        writeTasteLog(user_id, tags, priceRange, order.restaurant.id, 'low_rating')
      }

      res.send({
        status: 200,
        message: '评论成功'
      })
    } catch (err) {
      console.log('评论失败', err);
      res.send({
        status: -1,
        message: '评论失败'
      })
    }
  }

  // 后台添加评论
  async _makeComment(req, res, next) {
    let comment = req.body.comment;
    for (var i = 0; i < comment.length; i++) {
      let comment_data = new CommentModel(comment[i]);
      await comment_data.save();
    }
    res.send({
      status: 1
    })
  }

  //获取餐馆评论
  async getComment(req, res, next) {
    let {restaurant_id, offset = 0, limit = 5} = req.query;
    if (!restaurant_id) {
      res.send({
        status: -1,
        message: '获取餐馆评论失败，参数有误！'
      });
      return;
    }
    try {
      let comments = await CommentModel.find({restaurant_id}, '-_id').skip(offset * limit).limit(Number(limit)).sort({'comment_time': -1});
      res.send({
        status: 200,
        message: '获取餐馆评论成功',
        data: comments
      })
    } catch (err) {
      console.log('获取餐馆评论失败', err);
      res.send({
        status: -1,
        message: '获取餐馆评论失败'
      })
    }
  }

  //获取我的评论
  async myComment(req, res, next) {
    try {
      let user_id = req.session.admin_id || req.session.user_id;
      let comments = await CommentModel.find({user_id: user_id}).populate({path: 'restaurant'});
      res.send({
        status: 200,
        data: comments,
        message: '获取我的评论成功'
      })
    } catch (err) {
      console.log('获取我的评论失败', err);
      res.send({
        status: -1,
        message: '获取我的评论失败'
      })
    }
  }

  //商家获取我的店铺的用户评论
  async myRestaurantComment(req, res, next) {
    let user_id = req.session.admin_id;
    try {
      let restaurant = await RestaurantModel.findOne({user_id});
      if (!restaurant) {
        res.send({
          status: -1,
          message: '没有餐馆'
        });
        return false;
      }
      let comments = await CommentModel.find({restaurant_id: restaurant.id}, '-_id').sort({_id: -1});

      for (let i=0;i<comments.length;i++) {
        comments[i] = comments[i].toObject();
        let order = await OrderModel.findOne({id: comments[i].order_id}).populate(
          [{path: 'restaurant'}, {path: 'address'}]);
        comments[i].order = order;
        comments[i].comment_time = moment(comments[i].comment_time).format('YYYY-MM-DD');
      }

      res.send({
        status: 200,
        message: '获取我的餐馆评论成功',
        data: comments,
      })
    } catch (err) {
      console.log('获取我的餐馆用户评论失败', err);
      res.send({
        status: -1,
        message: '获取我的餐馆用户评论失败'
      });
    }
  }


  //商家回复评论
  async replyComment(req, res, next) {
    let {content, comment_id} = req.body;
    if (!content || !comment_id) {
      res.send({
        status: -1,
        message: '回复评论有误，参数有误!'
      });
      return;
    }
    let comments = await CommentModel.findOne({id: comment_id});
    comments.add_comment_list.push({content});
    await comments.save();
    res.send({
      status: 200,
      message: '回复评论成功'
    })
  }

  //获取店铺评论数
  async commentCount(req, res, nexy) {
    let {restaurant_id} = req.query;
    if (!restaurant_id) {
      res.send({
        status: -1,
        message: '获取评论数量失败，参数有误!'
      })
      return;
    }
    try {
      let restaurant = await RestaurantModel.findOne({id: restaurant_id}, '-_id');
      res.send({
        status: 200,
        data: restaurant.comment_number,
        message: '获取评论数量成功'
      })
    } catch (err) {
      console.log('获取评论数量失败', err);
      res.send({
        status: -1,
        message: '获取评论数量失败'
      })
    }
  }

  async deleteComment(req, res, next) {
    let {id} = req.body;
    let user_id = req.session.admin_id || req.session.user_id;
    if (!id) {
      res.send({
        status: -1,
        message: '删除评论失败，参数有误'
      })
      return
    }
    try {
      let result = await CommentModel.deleteOne({id, user_id: user_id});
      if (result && result.deletedCount > 0) {
        res.send({
          status: 200,
          message: '删除成功'
        })
      } else {
        res.send({
          status: -1,
          message: '删除失败'
        })
      }
    } catch (err) {
      console.log('删除评论失败', err);
      res.send({
        status: -1,
        message: '删除评论失败'
      })
    }
  }
// ── 评论摘要路由接口 ─────────────────────────────────────────
  async getCommentSummaryRoute(req, res) {
    const { restaurant_id, keyword, limit } = req.query
    if (!restaurant_id) return res.send({ status: -1, message: '缺少 restaurant_id 参数' })
    try {
      const data = await getCommentSummary(restaurant_id, keyword, limit)
      res.send({ status: 200, data })
    } catch (err) {
      res.send({ status: -1, message: '获取评论摘要失败' })
    }
  }
}

// ── getCommentSummary — 内部函数，供路由接口和 AI tool 共用 ──
async function getCommentSummary(restaurant_id, keyword, limit) {
  /* eslint-disable no-console */
  limit = Number(limit) || 20
  const cacheKey = `${restaurant_id}:${keyword || ''}`

  // 命中缓存直接返回
  const cached = summaryCache.get(cacheKey)
  if (cached && cached.expireAt > Date.now()) {
    return cached.data
  }

  try {
    // 查询最近 limit 条评论
    let query = { restaurant_id: Number(restaurant_id) }
    if (keyword) {
      query.comment_data = { $regex: keyword, $options: 'i' }
    }
    const comments = await CommentModel.find(query)
      .sort({ comment_time: -1 })
      .limit(limit)
      .lean()

    const total_count = comments.length

    // 无评论
    if (!total_count) {
      const result = { restaurant_name: '', avg_scores: null, distribution: { 5:0, 4:0, 3:0, 2:0, 1:0 }, samples: [], summary_text: '暂无评论', total_count: 0 }
      summaryCache.set(cacheKey, { data: result, expireAt: Date.now() + CACHE_TTL })
      return result
    }

    // 评分分布
    const distribution = { 5:0, 4:0, 3:0, 2:0, 1:0 }
    let sumFood = 0, sumDelivery = 0, sumQuality = 0
    comments.forEach(c => {
      const star = Math.round(c.food_score || 0)
      if (distribution[star] !== undefined) distribution[star]++
      sumFood += c.food_score || 0
      sumDelivery += c.delivery_score || 0
      sumQuality += c.quality_score || 0
    })
    const n = total_count
    const avg_scores = {
      food: +(sumFood / n).toFixed(1),
      delivery: +(sumDelivery / n).toFixed(1),
      quality: +(sumQuality / n).toFixed(1)
    }

    // 代表性评论：高分最新、低分最新、含keyword最新
    const sorted_by_score_desc = [...comments].sort((a, b) => (b.food_score||0) - (a.food_score||0))
    const sorted_by_score_asc  = [...comments].sort((a, b) => (a.food_score||0) - (b.food_score||0))
    const samplesSet = new Map()
    if (sorted_by_score_desc[0]) samplesSet.set(sorted_by_score_desc[0]._id && sorted_by_score_desc[0]._id.toString(), sorted_by_score_desc[0])
    if (sorted_by_score_asc[0])  samplesSet.set(sorted_by_score_asc[0]._id && sorted_by_score_asc[0]._id.toString(), sorted_by_score_asc[0])
    if (keyword) {
      const withKw = comments.find(c => c.comment_data && c.comment_data.includes(keyword))
      if (withKw) samplesSet.set(withKw._id && withKw._id.toString(), withKw)
    }
    const samples = [...samplesSet.values()].slice(0, 3).map(c => ({
      text: (c.comment_data || '').slice(0, 50),
      food_score: c.food_score || 0
    }))

    // 查询餐馆名
    let restaurant_name = ''
    try {
      const rest = await RestaurantModel.findOne({ id: Number(restaurant_id) }).lean()
      restaurant_name = rest ? rest.name : ''
    } catch (e) { /* ignore */ }

    // ≥3条评论时调用 LLM 生成一句话摘要
    let summary_text = ''
    if (total_count >= 3) {
      try {
        const sampleTexts = samples.map((s, i) => `${i+1}. ${s.text}`).join('\n')
        const summaryResp = await openaiClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'deepseek-chat',
          messages: [{ role: 'user', content: `请用不超过30个字概括以下外卖餐馆评论的整体印象：\n${sampleTexts}\n综合评分：口味${avg_scores.food}/配送${avg_scores.delivery}/品质${avg_scores.quality}` }],
          stream: false,
          max_tokens: 60
        })
        const content = summaryResp.choices && summaryResp.choices[0] && summaryResp.choices[0].message && summaryResp.choices[0].message.content
        summary_text = content ? content.trim().slice(0, 30) : ''
      } catch (e) {
        console.log('[CommentSummary] LLM摘要失败:', e.message)
      }
    }

    const result = { restaurant_name, avg_scores, distribution, samples, summary_text, total_count }
    summaryCache.set(cacheKey, { data: result, expireAt: Date.now() + CACHE_TTL })
    return result
  } catch (err) {
    console.log('[CommentSummary] error:', err.message)
    return { restaurant_name: '', avg_scores: null, distribution: {}, samples: [], summary_text: '', total_count: 0 }
  }
}

const commentInstance = new Comment()
export default commentInstance
export { getCommentSummary }