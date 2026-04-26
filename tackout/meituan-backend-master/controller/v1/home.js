import FoodModel from '../../models/v1/foods'
import TasteLog from '../../models/v1/taste_log'
import { getUserTasteProfile } from './taste'

class Home {
  constructor() {
    this.homeRecommend = this.homeRecommend.bind(this)
  }

  /**
   * GET /v1/home/recommend
   * 按时段 + 用户口味画像 TOP tags 查询推荐菜品
   * 支持 excludeTags 过滤 + 近期避重
   * 无记录时回退到全局 month_saled TOP3
   */
  async homeRecommend(req, res) {
    const user_id = req.session.admin_id || req.session.user_id

    try {
      // 1. 根据当前时段确定品类关键词
      const hour = new Date().getHours()
      let timeKeywords = []
      if (hour >= 6 && hour < 10) {
        timeKeywords = ['早餐', '粥', '包子', '豆浆']
      } else if (hour >= 10 && hour < 14) {
        timeKeywords = ['午餐', '米饭', '面条', '盖浇饭']
      } else if (hour >= 14 && hour < 17) {
        timeKeywords = ['下午茶', '甜品', '奶茶', '饮料']
      } else if (hour >= 17 && hour < 21) {
        timeKeywords = ['晚餐', '炒菜', '火锅', '烧烤']
      } else {
        timeKeywords = ['宵夜', '小吃', '炸鸡', '饮料']
      }

      // 2. 获取用户口味画像（含近期标签用于避重）
      let userTags = []
      let excludeTags = []
      if (user_id) {
        // 近期3条日志标签，用于避重计算
        const recentLogs = await TasteLog.find({ user_id: String(user_id) })
          .sort({ created_at: -1 }).limit(3).lean().catch(() => [])
        const recentTags = recentLogs.flatMap(l => l.food_tags || [])

        const profile = await getUserTasteProfile(String(user_id), 5, { hour, recentTags })
        userTags = profile.topTags || []
        excludeTags = profile.excludeTags || []
      }

      // 3. 合并标签：用户偏好 + 时段词
      const allTags = [...new Set([...userTags, ...timeKeywords])]

      let foods = []

      if (allTags.length) {
        const tagRegex = allTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
        const regex = new RegExp(tagRegex, 'i')

        // 4. 构建排除条件
        let query = {
          $or: [{ tag_list: regex }, { name: regex }]
        }
        if (excludeTags.length) {
          const excludeRegex = excludeTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
          query.tag_list = { $not: new RegExp(excludeRegex, 'i') }
        }

        foods = await FoodModel.find(query)
          .sort({ month_saled: -1 })
          .limit(10)
          .lean()
      }

      // 5. 无结果时回退到全局 month_saled TOP3（排除负偏好标签）
      if (!foods.length) {
        let fallbackQuery = {}
        if (excludeTags.length) {
          const excludeRegex = excludeTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
          fallbackQuery = { tag_list: { $not: new RegExp(excludeRegex, 'i') } }
        }
        foods = await FoodModel.find(fallbackQuery)
          .sort({ month_saled: -1 })
          .limit(3)
          .lean()
      }

      res.send({
        status: 200,
        data: foods,
        message: '获取推荐菜品成功',
        meta: { userTags, timeKeywords, hour, excludeTags }
      })
    } catch (err) {
      console.log('homeRecommend error', err)
      res.send({ status: -1, message: '获取推荐失败' })
    }
  }
}

export default new Home()
