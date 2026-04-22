/**
 * search.js — 搜索辅助控制器
 *
 * GET /v1/search/hot  — 返回热门搜索词（当前为内置，后续可替换为统计逻辑）
 */

// 内置热门搜索词，按品类分组，前端可直接展示
const HOT_KEYWORDS = [
  '汉堡', '炸鸡', '麻辣烫', '火锅', '烤鸭',
  '寿司', '披萨', '炒饭', '米粉', '串串',
  '奶茶', '甜品', '沙拉', '煲仔饭', '肠粉'
]

class Search {
  constructor() {
    this.getHotKeywords = this.getHotKeywords.bind(this)
  }

  // GET /v1/search/hot
  getHotKeywords(req, res) {
    res.send({
      status: 200,
      data: HOT_KEYWORDS,
      message: '获取热门搜索词成功'
    })
  }
}

export default new Search()
