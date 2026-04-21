import FoodModel from '../../models/v1/foods'
import TasteLog from '../../models/v1/taste_log'

class Home {
  constructor() {
    this.homeRecommend = this.homeRecommend.bind(this)
  }

  /**
   * GET /v1/home/recommend
   * 按时段 + 用户口味画像 TOP tags 查询推荐菜品
   * 无记录时回退到全局 month_saled TOP3
   */
  async homeRecommend(req, res) {
    const user_id = req.session.admin_id || req.session.user_id

    try {
      // 1. 根据当前时段确定品类关键词权重
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

      // 2. 获取用户 TOP5 口味标签（近 30 天）
      let userTags = []
      if (user_id) {
        const since = new Date(Date.now() - 30 * 24 * 3600 * 1000)
        const tagAgg = await TasteLog.aggregate([
          { $match: { user_id: String(user_id), created_at: { $gte: since } } },
          { $unwind: '$food_tags' },
          { $group: { _id: '$food_tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ])
        userTags = tagAgg.map(t => t._id)
      }

      // 3. 合并标签：用户偏好 + 时段词
      const allTags = [...new Set([...userTags, ...timeKeywords])]

      let foods = []

      if (allTags.length) {
        // 构造正则：任一标签匹配即可
        const tagRegex = allTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
        const regex = new RegExp(tagRegex, 'i')
        foods = await FoodModel.find({
          $or: [
            { tag_list: regex },
            { name: regex }
          ]
        })
          .sort({ month_saled: -1 })
          .limit(10)
          .lean()
      }

      // 4. 无结果时回退到全局 month_saled TOP3
      if (!foods.length) {
        foods = await FoodModel.find({})
          .sort({ month_saled: -1 })
          .limit(3)
          .lean()
      }

      res.send({
        status: 200,
        data: foods,
        message: '获取推荐菜品成功',
        meta: { userTags, timeKeywords, hour }
      })
    } catch (err) {
      console.log('homeRecommend error', err)
      res.send({ status: -1, message: '获取推荐失败' })
    }
  }
}

export default new Home()
