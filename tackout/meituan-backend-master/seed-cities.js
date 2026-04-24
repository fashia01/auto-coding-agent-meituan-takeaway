/**
 * seed-cities.js — 全国一线热门城市菜品种子数据
 *
 * 新增内容：
 *   - 15 家餐馆（覆盖北京/上海/广州/成都/武汉/西安/杭州/重庆/南京/深圳/长沙/哈尔滨等城市）
 *   - 约 150 道菜品，覆盖烤鸭/火锅/串串/炸酱面/煲仔饭/肉夹馍/臭豆腐等代表性品类
 *   - 图片优先使用 Unsplash 公开图片，抓取失败自动从现有数据库图片中随机兜底
 *
 * 运行方式：
 *   npx babel-node seed-cities.js
 */

/* eslint-disable no-console */
const mongoose = require('mongoose');
const https = require('https');
const http = require('http');

const DB_URL = 'mongodb://127.0.0.1:27017/takeaway';

// ---- Schema ----
const foodsSchema = new mongoose.Schema({
  id: Number, restaurant_id: Number, category_id: Number,
  name: String, min_price: Number, description: String,
  pic_url: String, month_saled: Number, month_saled_content: String,
  tag_list: String, praise_num: Number, status: Number,
  skus: [{ id: Number, spec: String, description: String, price: String }],
  created_at: { type: Date, default: new Date() }
});
const restaurantSchema = new mongoose.Schema({
  id: Number, user_id: Number, name: String, pic_url: String,
  third_category: String, wm_poi_score: Number, delivery_score: Number,
  food_score: Number, month_sales: Number, month_sales_tip: String,
  delivery_time_tip: String, shipping_fee_tip: String,
  min_price_tip: String, average_price_tip: String,
  address: String, shipping_fee: Number, min_price: Number,
  bulletin: String, created_at: { type: Date, default: new Date() }
});
const categorySchema = new mongoose.Schema({
  id: Number, name: String, restaurant_id: Number,
  icon: String, spus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Foods' }]
});

const Food = mongoose.model('Foods', foodsSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const Category = mongoose.model('Category', categorySchema);

// ---- 图片URL检验 + 兜底 ----
function checkUrl(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: 4000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// 现有数据库中的可靠兜底图片（按食物类型分类）
const FALLBACK_PICS = {
  chicken: 'http://p1.meituan.net/wmproduct/ac5fc1fd90abfb0478ce4ec10c201bf856616.jpg',
  beef:    'http://p1.meituan.net/wmproduct/9cd3262db1cdfb8350aa0fec362af99b233044.jpg',
  pork:    'http://p0.meituan.net/wmproduct/cb031322e1e57aeeae32a27b4f19545c255875.jpg',
  noodle:  'http://p1.meituan.net/wmproduct/8ace797e27a3129bb170ceb9f2e00f21332606.jpg',
  rice:    'http://p0.meituan.net/wmproduct/5e8115219b03d1243db5d097ec89162d39656.jpg',
  soup:    'http://p0.meituan.net/wmproduct/2e9458fdacb19d9884da3f49dffa4344383070.jpg',
  snack:   'http://p0.meituan.net/wmproduct/9aec93cadecfb578bae18a6833c8cf12171116.jpg',
  drink:   'http://p1.meituan.net/wmproduct/ceebe879cffc8ee01a45ebf425468955132746.jpg',
  dessert: 'http://p0.meituan.net/wmproduct/28aa64447e4f6c298b105ff2137b1ec191263.jpg',
  default: 'http://p0.meituan.net/wmproduct/fcc0c684d62e949bdf18b5cd2da099cc64837.jpg',
};

// Unsplash 候选图片（已测试可用的优先）
const IMG = {
  // 中式主菜
  kung_pao_chicken:  'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&q=80',
  hot_pot:           'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  fried_rice:        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
  dumplings:         'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
  noodles:           'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',
  roast_duck:        'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=400&q=80',
  braised_pork:      'https://images.unsplash.com/photo-1544025162-d76594e8bb0c?w=400&q=80',
  mapo_tofu:         'https://images.unsplash.com/photo-1617196034099-e5c43c1a1c5b?w=400&q=80',
  congee:            'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80',
  steam_bun:         'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=400&q=80',
  skewers:           'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80',
  claypot_rice:      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
  spicy_crayfish:    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  stinky_tofu:       'https://images.unsplash.com/photo-1617196034099-e5c43c1a1c5b?w=400&q=80',
  roujiamo:          'https://images.unsplash.com/photo-1550950158-d0d960dff596?w=400&q=80',
  lamb_soup:         'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80',
  dongpo_pork:       'https://images.unsplash.com/photo-1544025162-d76594e8bb0c?w=400&q=80',
  west_lake_fish:    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80',
  chongqing_hotpot:  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
  salted_duck:       'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=400&q=80',
  hong_kong_style:   'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
  grilled_fish:      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80',
  northeast_food:    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80',
  hot_dry_noodles:   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',
  sushi:             'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&q=80',
  pizza:             'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  burger:            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
  dessert_general:   'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
  milk_tea:          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  salad:             'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  soup_dumpling:     'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=400&q=80',
  fried_chicken:     'https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=400&q=80',
  beef_noodle:       'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80',
};

// 图片缓存：避免重复检测
const picCache = {};

async function resolvePic(key, fallbackType = 'default') {
  if (picCache[key] !== undefined) return picCache[key];
  const url = IMG[key];
  if (url) {
    const ok = await checkUrl(url);
    if (ok) {
      picCache[key] = url;
      return url;
    }
  }
  const fallback = FALLBACK_PICS[fallbackType] || FALLBACK_PICS.default;
  picCache[key] = fallback;
  return fallback;
}

// ============================================================
// 数据定义
// ============================================================

const RESTAURANTS = [
  // ---- 北京 ----
  {
    id: 45, user_id: 1001, name: '老北京炸酱面馆（王府井店）',
    third_category: '面食', wm_poi_score: 4.6, delivery_score: 4.5, food_score: 4.7,
    month_sales: 523, month_sales_tip: '月售523单', delivery_time_tip: '约35分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥15起送', average_price_tip: '人均¥28',
    address: '北京市东城区王府井大街88号', shipping_fee: 3, min_price: 15,
    bulletin: '正宗老北京炸酱面，老面手擀，黄酱精制',
    pic_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&q=80'
  },
  {
    id: 46, user_id: 1002, name: '四季民福烤鸭（故宫旗舰店）',
    third_category: '北京烤鸭', wm_poi_score: 4.9, delivery_score: 4.8, food_score: 4.9,
    month_sales: 412, month_sales_tip: '月售412单', delivery_time_tip: '约40分钟',
    shipping_fee_tip: '配送费¥5', min_price_tip: '¥50起送', average_price_tip: '人均¥98',
    address: '北京市东城区景山前街20号', shipping_fee: 5, min_price: 50,
    bulletin: '果木烤制，皮脆肉嫩，北京烤鸭代表',
    pic_url: 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=200&q=80'
  },
  // ---- 上海 ----
  {
    id: 47, user_id: 1003, name: '沪上本帮菜·阿娘面（南京路店）',
    third_category: '上海本帮菜', wm_poi_score: 4.7, delivery_score: 4.6, food_score: 4.8,
    month_sales: 389, month_sales_tip: '月售389单', delivery_time_tip: '约30分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥20起送', average_price_tip: '人均¥45',
    address: '上海市黄浦区南京路步行街168号', shipping_fee: 3, min_price: 20,
    bulletin: '本帮红烧、糖醋，传承六十年老味道',
    pic_url: 'https://images.unsplash.com/photo-1544025162-d76594e8bb0c?w=200&q=80'
  },
  {
    id: 48, user_id: 1004, name: '喜茶·热麦（上海来福士店）',
    third_category: '甜品饮品', wm_poi_score: 4.8, delivery_score: 4.7, food_score: 4.8,
    month_sales: 876, month_sales_tip: '月售876单', delivery_time_tip: '约20分钟',
    shipping_fee_tip: '配送费¥2', min_price_tip: '¥15起送', average_price_tip: '人均¥32',
    address: '上海市黄浦区西藏中路268号来福士广场', shipping_fee: 2, min_price: 15,
    bulletin: '网红茶饮&烘焙，每日新鲜现做',
    pic_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80'
  },
  // ---- 广州 ----
  {
    id: 49, user_id: 1005, name: '广州天河煲仔饭专门店',
    third_category: '粤菜', wm_poi_score: 4.7, delivery_score: 4.6, food_score: 4.8,
    month_sales: 634, month_sales_tip: '月售634单', delivery_time_tip: '约35分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥20起送', average_price_tip: '人均¥38',
    address: '广州市天河区天河路385号', shipping_fee: 3, min_price: 20,
    bulletin: '瓦煲慢火焗饭，镬气十足，广州人的味道',
    pic_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=200&q=80'
  },
  // ---- 成都 ----
  {
    id: 50, user_id: 1006, name: '成都正宗串串香（春熙路总店）',
    third_category: '川菜/串串', wm_poi_score: 4.8, delivery_score: 4.7, food_score: 4.9,
    month_sales: 752, month_sales_tip: '月售752单', delivery_time_tip: '约30分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥18起送', average_price_tip: '人均¥42',
    address: '成都市锦江区春熙路中段88号', shipping_fee: 3, min_price: 18,
    bulletin: '成都秘制红汤底料，麻辣鲜香正宗川味',
    pic_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=200&q=80'
  },
  {
    id: 51, user_id: 1007, name: '李记麻辣香锅（太古里店）',
    third_category: '川菜/香锅', wm_poi_score: 4.7, delivery_score: 4.6, food_score: 4.7,
    month_sales: 489, month_sales_tip: '月售489单', delivery_time_tip: '约35分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥25起送', average_price_tip: '人均¥55',
    address: '成都市锦江区中纱帽街8号太古里', shipping_fee: 3, min_price: 25,
    bulletin: '现炒现做麻辣香锅，食材新鲜，当日现配',
    pic_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&q=80'
  },
  // ---- 武汉 ----
  {
    id: 52, user_id: 1008, name: '武汉蔡林记热干面（户部巷旗舰店）',
    third_category: '武汉小吃', wm_poi_score: 4.8, delivery_score: 4.7, food_score: 4.9,
    month_sales: 891, month_sales_tip: '月售891单', delivery_time_tip: '约25分钟',
    shipping_fee_tip: '配送费¥2', min_price_tip: '¥10起送', average_price_tip: '人均¥18',
    address: '武汉市武昌区民主路户部巷12号', shipping_fee: 2, min_price: 10,
    bulletin: '百年蔡林记，正宗武汉热干面，芝麻酱现拌',
    pic_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&q=80'
  },
  // ---- 西安 ----
  {
    id: 53, user_id: 1009, name: '西安老孙家肉夹馍&羊肉泡馍',
    third_category: '陕西小吃', wm_poi_score: 4.7, delivery_score: 4.6, food_score: 4.8,
    month_sales: 567, month_sales_tip: '月售567单', delivery_time_tip: '约30分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥15起送', average_price_tip: '人均¥35',
    address: '西安市碑林区回民街18号', shipping_fee: 3, min_price: 15,
    bulletin: '百年西安名小吃，腊汁肉夹馍·正宗羊肉泡馍',
    pic_url: 'https://images.unsplash.com/photo-1550950158-d0d960dff596?w=200&q=80'
  },
  // ---- 杭州 ----
  {
    id: 54, user_id: 1010, name: '楼外楼·东坡肉西湖醋鱼（湖滨店）',
    third_category: '浙菜', wm_poi_score: 4.8, delivery_score: 4.7, food_score: 4.9,
    month_sales: 298, month_sales_tip: '月售298单', delivery_time_tip: '约40分钟',
    shipping_fee_tip: '配送费¥5', min_price_tip: '¥40起送', average_price_tip: '人均¥78',
    address: '杭州市上城区南山路30号', shipping_fee: 5, min_price: 40,
    bulletin: '西湖边百年老字号，浙菜代表菜正宗出品',
    pic_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&q=80'
  },
  // ---- 重庆 ----
  {
    id: 55, user_id: 1011, name: '洪崖洞重庆火锅外卖（解放碑总店）',
    third_category: '重庆火锅', wm_poi_score: 4.9, delivery_score: 4.8, food_score: 4.9,
    month_sales: 623, month_sales_tip: '月售623单', delivery_time_tip: '约45分钟',
    shipping_fee_tip: '配送费¥5', min_price_tip: '¥50起送', average_price_tip: '人均¥88',
    address: '重庆市渝中区解放碑嘉陵江滨江路88号', shipping_fee: 5, min_price: 50,
    bulletin: '重庆牛油老火锅底料，麻辣鲜香回味无穷',
    pic_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&q=80'
  },
  // ---- 南京 ----
  {
    id: 56, user_id: 1012, name: '南京鸭血粉丝汤·盐水鸭（新街口店）',
    third_category: '南京小吃', wm_poi_score: 4.6, delivery_score: 4.5, food_score: 4.7,
    month_sales: 445, month_sales_tip: '月售445单', delivery_time_tip: '约30分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥15起送', average_price_tip: '人均¥28',
    address: '南京市玄武区新街口太平南路66号', shipping_fee: 3, min_price: 15,
    bulletin: '鸭都南京，正宗鸭血粉丝&桂花盐水鸭',
    pic_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=200&q=80'
  },
  // ---- 深圳 ----
  {
    id: 57, user_id: 1013, name: '香港茶餐厅（深圳万象城店）',
    third_category: '港式茶餐厅', wm_poi_score: 4.7, delivery_score: 4.6, food_score: 4.7,
    month_sales: 712, month_sales_tip: '月售712单', delivery_time_tip: '约30分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥20起送', average_price_tip: '人均¥48',
    address: '深圳市罗湖区宝安南路1881号万象城', shipping_fee: 3, min_price: 20,
    bulletin: '正宗港式出品，丝滑奶茶·脆皮烧腊·招牌菠萝油',
    pic_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&q=80'
  },
  // ---- 长沙 ----
  {
    id: 58, user_id: 1014, name: '长沙文和友·臭豆腐&口味虾（五一广场店）',
    third_category: '湘菜/小吃', wm_poi_score: 4.8, delivery_score: 4.7, food_score: 4.9,
    month_sales: 934, month_sales_tip: '月售934单', delivery_time_tip: '约35分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥20起送', average_price_tip: '人均¥58',
    address: '长沙市芙蓉区五一大道868号', shipping_fee: 3, min_price: 20,
    bulletin: '长沙必打卡！网红臭豆腐+口味虾+剁椒鱼头',
    pic_url: 'https://images.unsplash.com/photo-1617196034099-e5c43c1a1c5b?w=200&q=80'
  },
  // ---- 哈尔滨 ----
  {
    id: 59, user_id: 1015, name: '哈尔滨老厨家·锅包肉&东北烤串',
    third_category: '东北菜', wm_poi_score: 4.6, delivery_score: 4.5, food_score: 4.7,
    month_sales: 378, month_sales_tip: '月售378单', delivery_time_tip: '约35分钟',
    shipping_fee_tip: '配送费¥3', min_price_tip: '¥20起送', average_price_tip: '人均¥48',
    address: '哈尔滨市道里区中央大街88号', shipping_fee: 3, min_price: 20,
    bulletin: '东北老味道，锅包肉外酥里嫩·大骨汤炖猪肉',
    pic_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=200&q=80'
  },
];

// 分类（id 从 245 开始，之前 seed.js 已用到 244）
const CATEGORIES = [
  // 北京炸酱面馆 (45)
  { id: 245, name: '招牌面食', restaurant_id: 45 },
  { id: 246, name: '热菜配饭', restaurant_id: 45 },
  { id: 247, name: '小吃&凉菜', restaurant_id: 45 },
  // 四季民福烤鸭 (46)
  { id: 248, name: '烤鸭系列', restaurant_id: 46 },
  { id: 249, name: '配菜&主食', restaurant_id: 46 },
  // 沪上本帮菜 (47)
  { id: 250, name: '本帮经典', restaurant_id: 47 },
  { id: 251, name: '汤面&主食', restaurant_id: 47 },
  // 喜茶·热麦 (48)
  { id: 252, name: '招牌茶饮', restaurant_id: 48 },
  { id: 253, name: '烘焙甜品', restaurant_id: 48 },
  // 煲仔饭 (49)
  { id: 254, name: '招牌煲仔饭', restaurant_id: 49 },
  { id: 255, name: '小炒&配菜', restaurant_id: 49 },
  // 成都串串 (50)
  { id: 256, name: '荤串系列', restaurant_id: 50 },
  { id: 257, name: '素串系列', restaurant_id: 50 },
  { id: 258, name: '套餐组合', restaurant_id: 50 },
  // 麻辣香锅 (51)
  { id: 259, name: '招牌香锅', restaurant_id: 51 },
  { id: 260, name: '单点菜品', restaurant_id: 51 },
  // 热干面 (52)
  { id: 261, name: '热干面系列', restaurant_id: 52 },
  { id: 262, name: '武汉特色小吃', restaurant_id: 52 },
  // 西安小吃 (53)
  { id: 263, name: '肉夹馍系列', restaurant_id: 53 },
  { id: 264, name: '羊肉系列', restaurant_id: 53 },
  { id: 265, name: '面食&凉皮', restaurant_id: 53 },
  // 楼外楼 (54)
  { id: 266, name: '浙菜经典', restaurant_id: 54 },
  { id: 267, name: '汤&主食', restaurant_id: 54 },
  // 重庆火锅 (55)
  { id: 268, name: '火锅套餐', restaurant_id: 55 },
  { id: 269, name: '涮菜系列', restaurant_id: 55 },
  // 南京小吃 (56)
  { id: 270, name: '招牌鸭血粉丝', restaurant_id: 56 },
  { id: 271, name: '盐水鸭系列', restaurant_id: 56 },
  // 香港茶餐厅 (57)
  { id: 272, name: '港式奶茶&饮品', restaurant_id: 57 },
  { id: 273, name: '烧腊饭&粉面', restaurant_id: 57 },
  { id: 274, name: '港式小点', restaurant_id: 57 },
  // 长沙小吃 (58)
  { id: 275, name: '长沙臭豆腐', restaurant_id: 58 },
  { id: 276, name: '口味虾&小炒', restaurant_id: 58 },
  { id: 277, name: '湘菜经典', restaurant_id: 58 },
  // 东北菜 (59)
  { id: 278, name: '招牌东北菜', restaurant_id: 59 },
  { id: 279, name: '烧烤&串串', restaurant_id: 59 },
];

// 菜品数据（id 从 1860 开始，sku_id 从 1960 开始）
// 格式：[food_id, sku_id, restaurant_id, category_id, name, description, tags, min_price, month_saled, praise_num, img_key, fallback_type]
const FOODS_RAW = [
  // ===================== 北京炸酱面馆 (45) =====================
  [1860,1960,45,245,'老北京炸酱面','手擀面条劲道爽滑，黄酱精制炒肉丁，配时令小菜六种，地道北京味道','炸酱面,面食,北京,手擀面',16,312,278,'noodles','noodle'],
  [1861,1961,45,245,'北京打卤面','精心熬制卤汁，鸡蛋木耳黄花菜，浓郁卤香配手擀面','打卤面,面食,北京,卤面',14,198,167,'noodles','noodle'],
  [1862,1962,45,245,'麻酱凉面（夏季限定）','细面拌芝麻酱黄瓜丝，清凉爽口，老北京夏日必备','凉面,麻酱,北京,夏季',12,423,389,'noodles','noodle'],
  [1863,1963,45,246,'木须肉盖浇饭','鸡蛋猪肉木耳同炒，卤汁浇在白米饭上，家常下饭经典','木须肉,盖浇饭,猪肉,家常',22,156,134,'fried_rice','rice'],
  [1864,1964,45,247,'北京豆汁儿+焦圈','老北京传统早点，绿豆发酵豆汁搭配酥脆焦圈','豆汁,焦圈,北京,小吃,早餐',8,289,256,'snack','snack'],
  [1865,1965,45,247,'芝麻烧饼夹肉','外皮酥脆芝麻烧饼，夹进五香酱肉，热乎乎香喷喷','烧饼,小吃,北京,夹肉',10,347,312,'roujiamo','snack'],

  // ===================== 四季民福烤鸭 (46) =====================
  [1866,1966,46,248,'四季民福烤鸭（半只）','果木炭火烤制，皮脆肉嫩色泽红亮，附送荷叶饼+葱丝+甜面酱','烤鸭,北京烤鸭,果木,半只',98,234,218,'roast_duck','chicken'],
  [1867,1967,46,248,'四季民福烤鸭（整只）','整只果木烤鸭，宴请必备，赠送荷叶饼一盒、葱丝黄瓜丝各一份','烤鸭,北京烤鸭,整只,宴请',188,145,138,'roast_duck','chicken'],
  [1868,1968,46,248,'鸭架汤','烤鸭鸭架熬制浓白高汤，加豆腐白菜，滋味醇厚鲜甜','鸭架汤,汤,北京',28,312,289,'soup_dumpling','soup'],
  [1869,1969,46,249,'片鸭三吃·酱香卷饼','薄饼卷酥脆鸭皮，甜面酱葱丝黄瓜，一口满足感爆棚','烤鸭卷饼,北京烤鸭,脆皮',32,198,178,'roast_duck','chicken'],
  [1870,1970,46,249,'主食拼盘（荷叶饼+炒饭）','荷叶饼4张搭配招牌鸭油炒饭，主食搭档','主食,荷叶饼,炒饭',18,267,243,'fried_rice','rice'],

  // ===================== 沪上本帮菜 (47) =====================
  [1871,1971,47,250,'红烧肉（东坡款）','五花肉文火慢炖两小时，色如玛瑙油而不腻，入口即化','红烧肉,本帮菜,上海,东坡',38,312,289,'dongpo_pork','pork'],
  [1872,1972,47,250,'糖醋小排','上海本帮经典，里脊骨糖醋腌制，酸甜微辣，外酥里嫩','糖醋排骨,本帮菜,上海,排骨',42,267,245,'braised_pork','pork'],
  [1873,1973,47,250,'清炒虾仁','鲜活河虾现炒，清清爽爽，鲜味十足，上海家常名菜','虾仁,上海,清炒,海鲜',35,189,167,'west_lake_fish','soup'],
  [1874,1974,47,250,'草头圈子','猪大肠焯水爆炒，配上嫩绿草头，浓油赤酱本帮特色','草头圈子,本帮菜,猪肉,上海',28,145,128,'braised_pork','pork'],
  [1875,1975,47,251,'阿娘黄鱼面','新鲜大黄鱼打卤，配上手工细面，鲜美汤底是灵魂','黄鱼面,面食,上海,海鲜',26,423,389,'beef_noodle','noodle'],
  [1876,1976,47,251,'葱油拌面（本帮经典）','细面拌猪油葱油，鲜香扑鼻，简单却是上海人的心头好','葱油拌面,面食,上海',12,567,523,'noodles','noodle'],

  // ===================== 喜茶·热麦 (48) =====================
  [1877,1977,48,252,'芝芝莓莓（招牌）','新鲜草莓+芝士奶盖，酸甜清爽，网红爆款','奶茶,芝士,草莓,甜品',28,1234,1156,'milk_tea','drink'],
  [1878,1978,48,252,'多肉葡萄（爆款）','整颗青提鲜果+纯茶底，果香浓郁多汁，季节限定','奶茶,葡萄,水果,饮品',28,987,923,'milk_tea','drink'],
  [1879,1979,48,252,'波波冰（黑糖）','黑糖珍珠+鲜奶冰沙，浓郁黑糖香搭配Q弹波波','奶茶,黑糖,珍珠,冰饮',22,876,812,'milk_tea','drink'],
  [1880,1980,48,253,'芝士土司（招牌）','厚切吐司配浓厚芝士，外脆内软，现烤现卖','烘焙,土司,芝士,甜品',18,567,523,'dessert_general','dessert'],
  [1881,1981,48,253,'黑糖脏脏包','网红脏脏包，外皮可可，内馅黑糖奶油，拍照超好看','烘焙,脏脏包,黑糖,甜品',22,789,734,'dessert_general','dessert'],
  [1882,1982,48,253,'欧包·坚果蔓越莓','低糖欧式面包，坚果蔓越莓，健康早餐首选','欧包,面包,健康,烘焙',16,345,312,'dessert_general','dessert'],

  // ===================== 广州煲仔饭 (49) =====================
  [1883,1983,49,254,'腊味煲仔饭','广式腊肠腊肉双拼，瓦煲慢火焗，锅巴酥脆米饭喷香','煲仔饭,腊肠,广州,粤菜',28,456,423,'claypot_rice','rice'],
  [1884,1984,49,254,'黄鳝煲仔饭','新鲜黄鳝切片配豉汁葱姜，瓦煲烧出的鳝鱼鲜美嫩滑','煲仔饭,黄鳝,广州,粤菜',32,234,212,'claypot_rice','rice'],
  [1885,1985,49,254,'排骨煲仔饭','猪排骨豉汁腌制入味，饭粒饱满粒粒分明，镬气十足','煲仔饭,排骨,粤菜,广州',26,312,289,'claypot_rice','rice'],
  [1886,1986,49,255,'豉汁蒸排骨','新鲜猪排配豆豉蒜蓉，入口鲜嫩，粤式家常名菜','排骨,豉汁,粤菜,广州',22,189,167,'braised_pork','pork'],
  [1887,1987,49,255,'姜葱炒蟹','鲜活花蟹爆炒，姜葱提鲜，蟹黄饱满，广州人的最爱','炒蟹,海鲜,粤菜,广州',58,145,134,'west_lake_fish','soup'],

  // ===================== 成都串串 (50) =====================
  [1888,1988,50,256,'麻辣牛肉串（10支）','新鲜牛肉腌制，秘制麻辣底料涮煮，外香内嫩','串串,牛肉,麻辣,成都',18,567,523,'skewers','beef'],
  [1889,1989,50,256,'毛肚串（10支）','新鲜毛肚薄切，在沸腾红汤中七上八下，脆爽无比','串串,毛肚,麻辣,成都',16,789,734,'skewers','beef'],
  [1890,1990,50,256,'鸭肠串（10支）','鸭肠鲜脆，稍蘸红油汤底即可食用，弹牙过瘾','串串,鸭肠,麻辣,成都',15,623,589,'skewers','chicken'],
  [1891,1991,50,257,'宽粉串（5支）','宽粉吸饱红汤底料，软糯入味，素串必点','串串,宽粉,素食,成都',8,456,423,'noodles','noodle'],
  [1892,1992,50,257,'藕片串（5支）','新鲜莲藕切片，脆爽清甜，麻辣底料提味','串串,藕片,素菜,成都',8,378,345,'salad','snack'],
  [1893,1993,50,258,'成都串串香套餐（2人份）','荤串12+素串8+饮料2杯，含自选蘸碟，超值组合','串串,套餐,成都,2人份',58,312,289,'skewers','beef'],
  [1894,1994,50,258,'成都串串香套餐（4人份）','荤串28+素串16+饮料4杯，聚餐首选大份套餐','串串,套餐,成都,4人份',118,198,178,'skewers','beef'],

  // ===================== 麻辣香锅 (51) =====================
  [1895,1995,51,259,'麻辣香锅（牛肉款）','牛肉+土豆+年糕+宽粉，秘制香锅酱料现炒，香气四溢','麻辣香锅,牛肉,成都,辣',48,345,312,'hot_pot','beef'],
  [1896,1996,51,259,'麻辣香锅（海鲜款）','虾仁+鱿鱼+蛤蜊+蟹棒，海鲜麻辣香锅，鲜辣双重享受','麻辣香锅,海鲜,辣,成都',58,234,212,'hot_pot','soup'],
  [1897,1997,51,259,'麻辣香锅（素食款）','豆腐+香菇+藕片+土豆+宽粉，全素现炒，同样香辣过瘾','麻辣香锅,素食,辣,成都',32,189,167,'mapo_tofu','snack'],
  [1898,1998,51,260,'招牌麻辣豆腐','嫩豆腐切块入锅，麻辣酱汁翻炒，麻婆豆腐升级版','豆腐,麻辣,辣,成都',18,456,423,'mapo_tofu','snack'],
  [1899,1999,51,260,'干锅花椰菜','花椰菜+腊肉爆炒，干辣椒麻椒提香，下饭神器','干锅,花椰菜,辣,成都',22,312,289,'skewers','snack'],

  // ===================== 热干面 (52) =====================
  [1900,2000,52,261,'蔡林记正宗热干面','碱水面蒸熟过冷河，淋上芝麻酱+辣椒油+酸豆角，武汉早餐之魂','热干面,武汉,芝麻酱,面食',8,1234,1156,'hot_dry_noodles','noodle'],
  [1901,2001,52,261,'热干面（加蛋）','正宗热干面+卤蛋，营养更丰富，武汉人早餐标配','热干面,武汉,卤蛋,面食',10,987,923,'hot_dry_noodles','noodle'],
  [1902,2002,52,261,'牛肉热干面','热干面+卤牛肉片，肉香与芝麻香融合，升级版武汉特色','热干面,牛肉,武汉,面食',14,567,523,'beef_noodle','noodle'],
  [1903,2003,52,262,'武汉面窝（3个）','大米+黄豆磨浆油炸，外脆内软中间有孔，武汉早点必备','面窝,油炸,武汉,早餐',5,789,734,'steam_bun','snack'],
  [1904,2004,52,262,'鸭脖（辣味100g）','武汉精卤鸭脖，辣中带鲜，越啃越香，零食下酒两相宜','鸭脖,武汉,辣,卤味',16,623,589,'skewers','chicken'],
  [1905,2005,52,262,'豆皮（招牌）','糯米+猪肉+香菇三鲜豆皮，煎制金黄，外脆内糯','豆皮,武汉,早餐,小吃',12,456,423,'steam_bun','snack'],

  // ===================== 西安小吃 (53) =====================
  [1906,2006,53,263,'腊汁肉夹馍（经典款）','陕西白吉馍现烤，百年腊汁肉文火慢炖，一口回到西安','肉夹馍,西安,陕西,面食',12,678,634,'roujiamo','pork'],
  [1907,2007,53,263,'腊汁肉夹馍（辣味款）','腊汁肉+青椒，香辣版肉夹馍，爱吃辣的首选','肉夹馍,辣,西安,陕西',13,456,423,'roujiamo','pork'],
  [1908,2008,53,263,'腊汁肉夹馍（酱香款）','特调酱汁卤肉，层次更丰富，酱香浓郁版本','肉夹馍,酱香,西安,陕西',14,345,312,'roujiamo','pork'],
  [1909,2009,53,264,'羊肉泡馍（大份）','手掰馍块配鲜羊肉高汤，粉丝+豆腐+木耳，西安必吃','羊肉泡馍,西安,陕西,羊肉',32,567,523,'lamb_soup','soup'],
  [1910,2010,53,264,'红烧羊肉（半斤）','西北风味红烧羊肉，香料充足不膻，下饭好选择','羊肉,红烧,西安,陕西',35,234,212,'lamb_soup','beef'],
  [1911,2011,53,265,'岐山臊子面','西府岐山臊子面，酸辣鲜香，薄筋光酸辣汪，陕西关中风味','臊子面,面食,西安,陕西',14,456,423,'noodles','noodle'],
  [1912,2012,53,265,'秦镇凉皮（一份）','米皮细腻光滑，红油辣椒调味，黄瓜丝+花生，清爽开胃','凉皮,西安,陕西,素食',10,789,734,'salad','snack'],
  [1913,2013,53,265,'裤带面（关中宽面）','宽厚陕西手扯面，蘸油泼辣子，嚼劲十足','裤带面,面食,西安,陕西,辣',15,345,312,'noodles','noodle'],

  // ===================== 楼外楼 (54) =====================
  [1914,2014,54,266,'东坡肉（招牌）','苏东坡秘方红烧，连皮带骨整块慢焖三小时，入口即化','东坡肉,浙菜,杭州,猪肉',58,234,218,'dongpo_pork','pork'],
  [1915,2015,54,266,'西湖醋鱼','西湖鲜活草鱼，用西湖水烹制，糖醋汁浇淋，浙菜招牌','西湖醋鱼,浙菜,杭州,鱼',68,189,178,'west_lake_fish','soup'],
  [1916,2016,54,266,'龙井虾仁','新鲜活虾剥壳，配明前龙井嫩芽同炒，鲜嫩清雅','龙井虾仁,浙菜,杭州,虾',88,145,138,'kung_pao_chicken','soup'],
  [1917,2017,54,266,'宋嫂鱼羹','南宋传统名点，鱼肉羹汤加木耳笋丝勾芡，丝滑鲜甜','鱼羹,浙菜,杭州,汤品',32,167,156,'west_lake_fish','soup'],
  [1918,2018,54,267,'西湖莼菜汤','西湖特产莼菜，口感滑润，高汤提鲜，素雅清香','莼菜汤,浙菜,杭州,汤品',28,134,123,'soup_dumpling','soup'],
  [1919,2019,54,267,'荷叶蒸饭','鲜荷叶包裹糯米五花肉，清蒸至熟，荷香透入糯米','荷叶蒸饭,浙菜,杭州,主食',22,198,178,'claypot_rice','rice'],

  // ===================== 重庆火锅 (55) =====================
  [1920,2020,55,268,'重庆牛油老火锅套餐（2人份）','牛油麻辣底料+毛肚+鸭肠+鲜牛肉+午餐肉+时蔬，2人套餐','火锅,重庆,麻辣,套餐,2人份',98,456,423,'chongqing_hotpot','beef'],
  [1921,2021,55,268,'重庆鸳鸯火锅（4人份）','牛油麻辣+清汤双锅底，荤菜6+素菜4+主食，聚餐必选','火锅,重庆,鸳鸯锅,4人份',198,234,218,'chongqing_hotpot','beef'],
  [1922,2022,55,269,'现切鲜毛肚（200g）','当天现宰毛肚，厚薄均匀手切，七上八下脆爽弹牙','毛肚,火锅,重庆,牛肉',45,345,312,'skewers','beef'],
  [1923,2023,55,269,'冻豆腐（300g）','孔多吸汤的冻豆腐，涮火锅最佳，鲜辣汤汁满溢','冻豆腐,火锅,素食,重庆',12,234,212,'mapo_tofu','snack'],
  [1924,2024,55,269,'红薯粉（一份）','宽薯粉韧劲十足，吸饱麻辣底料，越煮越好吃','红薯粉,火锅,重庆,粉类',10,378,345,'noodles','noodle'],
  [1925,2025,55,269,'重庆小面（加餐）','辣得够劲的重庆小面，花椒油+红油辣椒，面条有弹性','小面,面食,重庆,辣',8,567,523,'hot_dry_noodles','noodle'],

  // ===================== 南京小吃 (56) =====================
  [1926,2026,56,270,'鸭血粉丝汤（招牌）','鸭血嫩滑+细粉丝+鸭肠鸭肝，浓香白汤，南京灵魂早餐','鸭血粉丝,南京,汤粉,早餐',12,876,812,'soup_dumpling','soup'],
  [1927,2027,56,270,'鸭血粉丝汤（豪华款）','双份鸭血+双份粉丝+鸭胗鸭肠，分量加倍满足感翻倍','鸭血粉丝,南京,豪华',16,567,523,'soup_dumpling','soup'],
  [1928,2028,56,271,'桂花盐水鸭（整只）','南京金陵鸭，桂花卤汁腌制，皮嫩肉鲜不油腻，下酒佳品','盐水鸭,南京,鸭肉,卤味',68,345,312,'salted_duck','chicken'],
  [1929,2029,56,271,'盐水鸭腿（单只）','精选鸭腿，桂花盐水腌制，肉质紧实鲜嫩，南京必吃','盐水鸭腿,南京,鸭肉',22,456,423,'salted_duck','chicken'],
  [1930,2030,56,271,'鸭油烧饼','鸭油酥层层叠叠，外酥里嫩，南京传统早点','烧饼,鸭油,南京,早餐',5,678,634,'roujiamo','snack'],

  // ===================== 香港茶餐厅 (57) =====================
  [1931,2031,57,272,'港式丝滑奶茶','锡兰红茶与鲜奶比例黄金，丝滑绵密，正宗港式出品','奶茶,港式,茶饮,饮品',18,987,923,'milk_tea','drink'],
  [1932,2032,57,272,'鸳鸯（咖啡+奶茶）','咖啡与奶茶完美融合，苦中带甜，港式标志性饮品','鸳鸯,咖啡,奶茶,港式',20,756,712,'milk_tea','drink'],
  [1933,2033,57,272,'冻柠茶','新鲜柠檬+港式锡兰茶，清爽解腻，夏日必备','柠茶,冷饮,港式,夏季',16,1234,1156,'milk_tea','drink'],
  [1934,2034,57,273,'叉烧饭','港式蜜汁叉烧，色泽红亮蜜香扑鼻，配白饭+汤','叉烧饭,港式,烧腊,粤菜',28,567,523,'roast_duck','pork'],
  [1935,2035,57,273,'烧鸭饭','脆皮烧鸭切片饭，皮脆肉嫩鸭油香，港式茶餐厅招牌','烧鸭饭,港式,烧腊',26,678,634,'roast_duck','chicken'],
  [1936,2036,57,273,'叉烧肠粉','顺滑米浆蒸制，包裹鲜甜叉烧馅，淋甜酱花生酱','肠粉,叉烧,港式,早茶',18,456,423,'soup_dumpling','pork'],
  [1937,2037,57,274,'菠萝油（招牌）','酥皮菠萝包刚出炉，夹进融化牛油，港式点心之王','菠萝油,港式,甜点,早茶',12,1234,1156,'dessert_general','dessert'],
  [1938,2038,57,274,'蛋挞（3个）','原味酥皮蛋挞，外皮层次分明，蛋液嫩滑，葡式改良版','蛋挞,甜品,港式,烘焙',15,987,934,'dessert_general','dessert'],

  // ===================== 长沙小吃 (58) =====================
  [1939,2039,58,275,'文和友臭豆腐（经典款6块）','长沙臭豆腐现炸，外脆内嫩，配秘制辣酱，越臭越好吃','臭豆腐,长沙,湖南,小吃',12,1234,1156,'stinky_tofu','snack'],
  [1940,2040,58,275,'双份臭豆腐（12块）','经典款加量版，聚餐分享装，更多辣酱满满足','臭豆腐,长沙,湖南',22,789,745,'stinky_tofu','snack'],
  [1941,2041,58,276,'长沙口味虾（1斤）','现捞现炒，十三香+紫苏+剁椒三重香，肉质鲜嫩Q弹','口味虾,小龙虾,长沙,湘菜',48,567,534,'spicy_crayfish','soup'],
  [1942,2042,58,276,'剁椒鱼头（半只）','湘西传统剁椒蒸鱼头，剁椒酸辣，鱼头鲜嫩入味','剁椒鱼头,湘菜,长沙,辣',58,345,323,'grilled_fish','soup'],
  [1943,2043,58,276,'小炒肉（招牌）','带皮猪肉+青椒大火爆炒，长沙小炒最正宗，下饭神器','小炒肉,猪肉,湘菜,辣',28,678,645,'braised_pork','pork'],
  [1944,2044,58,277,'湘西外婆菜炒腊肉','腊肉熏香+外婆菜开胃，湖南特色下饭组合','腊肉,湘菜,湖南,辣',32,456,423,'braised_pork','pork'],
  [1945,2045,58,277,'毛氏红烧肉','毛家菜招牌，五花肉+豆腐干+鸡蛋，浓油赤酱湘式做法','红烧肉,湘菜,毛家菜,猪肉',38,523,489,'dongpo_pork','pork'],

  // ===================== 东北菜 (59) =====================
  [1946,2046,59,278,'招牌锅包肉','里脊肉外挂酥皮，糖醋汁浇淋，外酥甜脆，东北特色名菜','锅包肉,东北菜,猪肉,糖醋',32,456,423,'braised_pork','pork'],
  [1947,2047,59,278,'猪肉炖粉条（大砂锅）','五花肉+东北宽粉，砂锅慢炖，油脂醇厚粉条吸饱汤汁','猪肉炖粉条,东北菜,炖菜',38,312,289,'braised_pork','pork'],
  [1948,2048,59,278,'东北乱炖（荤素）','土豆+茄子+豆角+猪肉+玉米，东北大乱炖，暖胃暖心','东北乱炖,东北菜,炖菜',42,234,212,'braised_pork','pork'],
  [1949,2049,59,278,'小鸡炖蘑菇（半只）','农家小鸡+东北榛蘑慢炖，汤鲜肉嫩蘑菇香浓','小鸡炖蘑菇,东北菜,鸡肉',48,198,178,'kung_pao_chicken','chicken'],
  [1950,2050,59,279,'东北烤串·羊肉串（10支）','新鲜羊腿肉切块穿串，孜然辣椒粉撒上，炭火烤制','羊肉串,烧烤,东北,孜然',20,567,534,'skewers','beef'],
  [1951,2051,59,279,'东北烤串·五花肉卷大葱（10支）','薄切五花肉卷大葱，炭火烤至微焦，肥瘦相间香嫩多汁','五花肉,烧烤,东北',18,423,389,'skewers','pork'],
  [1952,2052,59,279,'烤玉米（甜糯2支）','东北甜糯玉米，炭火慢烤，刷黄油+孜然，香甜软糯','烤玉米,烧烤,东北,甜食',10,345,312,'skewers','snack'],
];

// ============================================================
// 主逻辑
// ============================================================
async function main() {
  await mongoose.connect(DB_URL);
  console.log('✅ MongoDB 连接成功\n');

  let restOk = 0, catOk = 0, foodOk = 0;

  // Step 1: 新增餐馆
  console.log('🏪 Step 1: 新增城市餐馆...');
  for (const r of RESTAURANTS) {
    const exists = await Restaurant.findOne({ id: r.id });
    if (exists) { console.log(`  ⏭  [${r.id}] ${r.name}`); continue; }
    // 验证并修复餐馆图片
    const ok = await checkUrl(r.pic_url);
    if (!ok) r.pic_url = FALLBACK_PICS.default;
    await new Restaurant(r).save();
    console.log(`  ✅ [${r.id}] ${r.name} (score:${r.wm_poi_score})`);
    restOk++;
  }

  // Step 2: 新增分类
  console.log('\n📂 Step 2: 新增菜品分类...');
  for (const c of CATEGORIES) {
    const exists = await Category.findOne({ id: c.id });
    if (exists) { console.log(`  ⏭  [${c.id}] ${c.name}`); continue; }
    await new Category({ ...c, spus: [] }).save();
    console.log(`  ✅ [${c.id}] ${c.name} (餐馆${c.restaurant_id})`);
    catOk++;
  }

  // Step 3: 新增菜品（含图片检验）
  console.log('\n🍜 Step 3: 新增菜品（含图片验证，请稍候）...');
  for (const row of FOODS_RAW) {
    const [food_id, sku_id, restaurant_id, category_id, name, description, tag_list,
           min_price, month_saled, praise_num, img_key, fallback_type] = row;

    const exists = await Food.findOne({ id: food_id });
    if (exists) { console.log(`  ⏭  [${food_id}] ${name}`); continue; }

    const pic_url = await resolvePic(img_key, fallback_type);

    await new Food({
      id: food_id,
      restaurant_id,
      category_id,
      name,
      description,
      tag_list,
      min_price,
      month_saled,
      month_saled_content: String(month_saled),
      praise_num,
      pic_url,
      status: 0,
      skus: [{ id: sku_id, spec: '', description: '', price: String(min_price) + '.0' }],
      created_at: new Date()
    }).save();
    console.log(`  ✅ [${food_id}] ${name} ¥${min_price} 月售${month_saled}`);
    foodOk++;
  }

  // 统计
  const totalFoods = await Food.countDocuments();
  const totalRestaurants = await Restaurant.countDocuments();
  console.log(`\n📊 最终数据统计:`);
  console.log(`  菜品总数: ${totalFoods}`);
  console.log(`  餐馆总数: ${totalRestaurants}`);
  console.log(`\n  本次新增: 餐馆 ${restOk} 家，分类 ${catOk} 个，菜品 ${foodOk} 道`);

  // 回填分类 spus 关联（确保 populate 能正确展开菜品）
  console.log('\n🔗 回填分类 spus 关联...');
  const allCats = await Category.find({});
  let spusFixed = 0;
  for (const cat of allCats) {
    const foods = await Food.find({ category_id: cat.id }, '_id');
    const ids = foods.map(f => f._id);
    if (ids.length > 0 && cat.spus.length !== ids.length) {
      await Category.updateOne({ _id: cat._id }, { $set: { spus: ids } });
      spusFixed++;
    }
  }
  console.log(`  ✅ 更新了 ${spusFixed} 个分类的 spus 关联`);
  console.log('\n✅ 种子数据写入完成！');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
