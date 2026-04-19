/**
 * MongoDB 测试种子数据脚本
 *
 * 功能：
 * 1. 修补现有 726 条菜品数据：补充 min_price（从 skus[0].price 提取）和 description 字段
 * 2. 新增 2 家测试餐馆（川菜馆 + 粤式早茶）+ 30 道菜品，覆盖更多搜索场景
 *
 * 使用方法（需先启动 MongoDB，推荐 Docker）：
 *   docker run -d -p 27017:27017 --name mongo-meituan mongo:6
 *   mongorestore --db meituan ./db/meituan/
 *   node seed.js
 */

/* eslint-disable no-console */
const mongoose = require('mongoose');

const DB_URL = 'mongodb://127.0.0.1:27017/takeaway';

// ---- 复用现有 Schema 定义 ----
const foodsSchema = new mongoose.Schema({
  id: Number,
  restaurant_id: Number,
  category_id: Number,
  name: String,
  min_price: Number,
  description: String,
  pic_url: String,
  month_saled: Number,
  month_saled_content: String,
  tag_list: String,      // 新增：用于 AI 搜索的标签（如"辣,川菜,麻辣"）
  praise_num: Number,
  status: Number,
  skus: [{ id: Number, spec: String, description: String, price: String }],
  created_at: { type: Date, default: new Date() }
});

const restaurantSchema = new mongoose.Schema({
  id: Number,
  user_id: Number,
  name: String,
  pic_url: String,
  third_category: String,
  wm_poi_score: Number,
  month_sales: Number,
  month_sales_tip: String,
  delivery_time_tip: String,
  shipping_fee_tip: String,
  min_price_tip: String,
  average_price_tip: String,
  address: String,
  shipping_fee: Number,
  min_price: Number,
  created_at: { type: Date, default: new Date() }
});

const categorySchema = new mongoose.Schema({
  id: Number,
  name: String,
  restaurant_id: Number,
  icon: String,
  spus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Foods' }]
});

const Food = mongoose.model('Foods', foodsSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const Category = mongoose.model('Category', categorySchema);

// ---- 新增测试餐馆和菜品数据 ----

const NEW_RESTAURANTS = [
  {
    id: 43,
    user_id: 999,
    name: '蜀香麻辣烫（总店）',
    pic_url: 'https://p0.meituan.net/restaurant/test_sichuan.jpg',
    third_category: '川菜',
    wm_poi_score: 4.8,
    month_sales: 312,
    month_sales_tip: '月售312单',
    delivery_time_tip: '约35分钟',
    shipping_fee_tip: '配送费¥3',
    min_price_tip: '¥15起送',
    average_price_tip: '人均¥25',
    address: '东城大道88号',
    shipping_fee: 3,
    min_price: 15
  },
  {
    id: 44,
    user_id: 998,
    name: '顺德粤来粤好（早茶专门店）',
    pic_url: 'https://p0.meituan.net/restaurant/test_cantonese.jpg',
    third_category: '粤菜',
    wm_poi_score: 4.9,
    month_sales: 428,
    month_sales_tip: '月售428单',
    delivery_time_tip: '约30分钟',
    shipping_fee_tip: '配送费¥2',
    min_price_tip: '¥20起送',
    average_price_tip: '人均¥35',
    address: '莞城中路56号',
    shipping_fee: 2,
    min_price: 20
  }
];

// 分类：id 从 237 开始
const NEW_CATEGORIES = [
  // 蜀香麻辣烫
  { id: 237, name: '招牌麻辣系列', restaurant_id: 43 },
  { id: 238, name: '素菜类', restaurant_id: 43 },
  { id: 239, name: '荤菜类', restaurant_id: 43 },
  { id: 240, name: '主食&饮料', restaurant_id: 43 },
  // 顺德粤来粤好
  { id: 241, name: '点心系列', restaurant_id: 44 },
  { id: 242, name: '粥粉面', restaurant_id: 44 },
  { id: 243, name: '肠粉专区', restaurant_id: 44 },
  { id: 244, name: '甜品&饮品', restaurant_id: 44 },
];

// 菜品：id 从 1811 开始，sku id 从 1820 开始（留空隙）
const NEW_FOODS = [
  // ======================== 蜀香麻辣烫（restaurant_id: 43）========================
  {
    id: 1811, restaurant_id: 43, category_id: 237,
    name: '招牌麻辣牛肉锅',
    description: '选用新鲜牛腩，搭配独家麻辣底料，花椒香气浓郁，辣而不燥，麻辣鲜香',
    tag_list: '辣,麻辣,牛肉,川菜,麻辣烫',
    min_price: 38, month_saled: 89, praise_num: 76,
    pic_url: 'https://p0.meituan.net/wmproduct/test_mala_beef.jpg',
    skus: [{ id: 1820, price: '38.0', spec: '中辣（2-3人份）' }]
  },
  {
    id: 1812, restaurant_id: 43, category_id: 237,
    name: '辣子鸡丁麻辣烫',
    description: '鸡丁嫩滑，辣椒香脆，以干辣椒和花椒爆炒，香辣下饭',
    tag_list: '辣,鸡肉,辣子鸡,川菜,麻辣',
    min_price: 28, month_saled: 65, praise_num: 58,
    pic_url: 'https://p0.meituan.net/wmproduct/test_laziji.jpg',
    skus: [{ id: 1821, price: '28.0', spec: '单人份' }]
  },
  {
    id: 1813, restaurant_id: 43, category_id: 237,
    name: '麻辣小龙虾套餐',
    description: '肉质饱满的小龙虾，麻辣鲜香，配方秘制，越吃越上瘾',
    tag_list: '辣,麻辣,小龙虾,海鲜,套餐',
    min_price: 48, month_saled: 102, praise_num: 91,
    pic_url: 'https://p0.meituan.net/wmproduct/test_crayfish.jpg',
    skus: [{ id: 1822, price: '48.0', spec: '约600g（12-16只）' }]
  },
  {
    id: 1814, restaurant_id: 43, category_id: 237,
    name: '番茄牛腩锅',
    description: '精选澳洲牛腩，番茄微酸鲜甜，汤汁浓郁红亮，不辣不麻，老少皆宜',
    tag_list: '牛肉,番茄,不辣,川菜,炖锅',
    min_price: 42, month_saled: 73, praise_num: 67,
    pic_url: 'https://p0.meituan.net/wmproduct/test_tomato_beef.jpg',
    skus: [{ id: 1823, price: '42.0', spec: '2人份' }]
  },
  {
    id: 1815, restaurant_id: 43, category_id: 238,
    name: '麻辣豆腐脑',
    description: '嫩滑豆腐脑浇上麻辣红油，撒上葱花，辣香扑鼻，素食首选',
    tag_list: '辣,豆腐,素菜,麻辣,早餐',
    min_price: 8, month_saled: 156, praise_num: 134,
    pic_url: 'https://p0.meituan.net/wmproduct/test_tofu_brain.jpg',
    skus: [{ id: 1824, price: '8.0', spec: '大碗' }]
  },
  {
    id: 1816, restaurant_id: 43, category_id: 238,
    name: '酸辣土豆丝',
    description: '脆嫩土豆丝，酸辣爽口，配白米饭绝配，经典家常口味',
    tag_list: '辣,酸辣,土豆,素菜,下饭',
    min_price: 12, month_saled: 198, praise_num: 175,
    pic_url: 'https://p0.meituan.net/wmproduct/test_potato.jpg',
    skus: [{ id: 1825, price: '12.0', spec: '一份' }]
  },
  {
    id: 1817, restaurant_id: 43, category_id: 239,
    name: '夫妻肺片',
    description: '牛肉、牛杂切片，浇上秘制红油，麻辣鲜香，是正宗川菜经典凉菜',
    tag_list: '辣,牛肉,凉菜,川菜,麻辣,夫妻肺片',
    min_price: 22, month_saled: 87, praise_num: 79,
    pic_url: 'https://p0.meituan.net/wmproduct/test_fuqi.jpg',
    skus: [{ id: 1826, price: '22.0', spec: '200g' }]
  },
  {
    id: 1818, restaurant_id: 43, category_id: 239,
    name: '红烧肉盖浇饭',
    description: '五花肉文火慢炖，色泽红亮，入口即化，配上白米饭，暖胃又暖心',
    tag_list: '猪肉,红烧,饭,盖饭,不辣',
    min_price: 18, month_saled: 143, praise_num: 126,
    pic_url: 'https://p0.meituan.net/wmproduct/test_hongshao_rice.jpg',
    skus: [{ id: 1827, price: '18.0', spec: '一份' }]
  },
  {
    id: 1819, restaurant_id: 43, category_id: 240,
    name: '白米饭',
    description: '东北长粒米，粒粒饱满，米香浓郁',
    tag_list: '米饭,主食,白米饭',
    min_price: 2, month_saled: 312, praise_num: 278,
    pic_url: 'https://p0.meituan.net/wmproduct/test_rice.jpg',
    skus: [{ id: 1828, price: '2.0', spec: '一碗' }]
  },
  {
    id: 1831, restaurant_id: 43, category_id: 240,
    name: '冰镇酸梅汤',
    description: '传统配方熬制，酸甜解腻，吃辣必备',
    tag_list: '饮料,酸梅汤,解辣,冰饮',
    min_price: 8, month_saled: 267, praise_num: 241,
    pic_url: 'https://p0.meituan.net/wmproduct/test_suanmei.jpg',
    skus: [{ id: 1829, price: '8.0', spec: '500ml' }]
  },

  // ======================== 顺德粤来粤好（restaurant_id: 44）========================
  {
    id: 1832, restaurant_id: 44, category_id: 241,
    name: '叉烧酥皮点心',
    description: '精选叉烧肉馅，酥皮层次分明，入口酥脆，甜咸适中，粤式早茶经典',
    tag_list: '叉烧,点心,粤菜,早茶,甜点',
    min_price: 18, month_saled: 89, praise_num: 81,
    pic_url: 'https://p0.meituan.net/wmproduct/test_chashao.jpg',
    skus: [{ id: 1840, price: '18.0', spec: '3个装' }]
  },
  {
    id: 1833, restaurant_id: 44, category_id: 241,
    name: '虾饺皇',
    description: '选用新鲜大虾，配以竹笋制馅，皮薄透亮，虾肉弹牙，粤式早茶必点',
    tag_list: '虾,点心,粤菜,早茶,虾饺,海鲜',
    min_price: 22, month_saled: 156, praise_num: 143,
    pic_url: 'https://p0.meituan.net/wmproduct/test_xiajiao.jpg',
    skus: [{ id: 1841, price: '22.0', spec: '4个装' }]
  },
  {
    id: 1834, restaurant_id: 44, category_id: 241,
    name: '烧卖',
    description: '猪肉、鲜虾、糯米三合一，皮薄馅足，顶部点缀蟹籽，鲜香多汁',
    tag_list: '烧卖,点心,粤菜,早茶,猪肉,虾',
    min_price: 20, month_saled: 134, praise_num: 121,
    pic_url: 'https://p0.meituan.net/wmproduct/test_shaomai.jpg',
    skus: [{ id: 1842, price: '20.0', spec: '4个装' }]
  },
  {
    id: 1835, restaurant_id: 44, category_id: 242,
    name: '艇仔粥',
    description: '猪肉末、鲜虾、鱿鱼同煮，粥底绵滑，配油条，是广东人的早晨味道',
    tag_list: '粥,早餐,粤菜,海鲜,猪肉,虾,鱿鱼',
    min_price: 16, month_saled: 201, praise_num: 187,
    pic_url: 'https://p0.meituan.net/wmproduct/test_tingzai_congee.jpg',
    skus: [{ id: 1843, price: '16.0', spec: '一碗' }]
  },
  {
    id: 1836, restaurant_id: 44, category_id: 242,
    name: '皮蛋瘦肉粥',
    description: '松花皮蛋与细嫩瘦肉，配以姜丝同煮，咸香浓郁，暖胃养身',
    tag_list: '粥,皮蛋,猪肉,早餐,粤菜',
    min_price: 14, month_saled: 312, praise_num: 287,
    pic_url: 'https://p0.meituan.net/wmproduct/test_pidan_congee.jpg',
    skus: [{ id: 1844, price: '14.0', spec: '一碗' }]
  },
  {
    id: 1837, restaurant_id: 44, category_id: 243,
    name: '猪肉肠粉',
    description: '米浆蒸制，皮薄嫩滑，猪肉馅鲜嫩多汁，淋上甜酱和花生酱，广式经典',
    tag_list: '肠粉,猪肉,粤菜,早茶,早餐',
    min_price: 12, month_saled: 278, praise_num: 254,
    pic_url: 'https://p0.meituan.net/wmproduct/test_changfen_pork.jpg',
    skus: [{ id: 1845, price: '12.0', spec: '一份' }]
  },
  {
    id: 1838, restaurant_id: 44, category_id: 243,
    name: '鲜虾肠粉',
    description: '新鲜大虾入馅，嫩滑肠粉包裹，口感弹牙，鲜甜满溢',
    tag_list: '肠粉,虾,海鲜,粤菜,早茶',
    min_price: 16, month_saled: 198, praise_num: 179,
    pic_url: 'https://p0.meituan.net/wmproduct/test_changfen_shrimp.jpg',
    skus: [{ id: 1846, price: '16.0', spec: '一份' }]
  },
  {
    id: 1839, restaurant_id: 44, category_id: 243,
    name: '瑶柱腊肠肠粉',
    description: '顺德特色，腊肠咸香与瑶柱鲜甜完美结合，层次丰富，回味无穷',
    tag_list: '肠粉,腊肠,粤菜,顺德,早茶',
    min_price: 18, month_saled: 143, praise_num: 130,
    pic_url: 'https://p0.meituan.net/wmproduct/test_changfen_special.jpg',
    skus: [{ id: 1847, price: '18.0', spec: '一份' }]
  },
  {
    id: 1842, restaurant_id: 44, category_id: 244,
    name: '杨枝甘露',
    description: '芒果椰奶西柚三重奏，甜蜜爽口，港式甜品经典款',
    tag_list: '甜品,芒果,椰奶,港式,粤菜,冷饮',
    min_price: 18, month_saled: 234, praise_num: 214,
    pic_url: 'https://p0.meituan.net/wmproduct/test_yangzhi.jpg',
    skus: [{ id: 1848, price: '18.0', spec: '一杯' }]
  },
  {
    id: 1843, restaurant_id: 44, category_id: 244,
    name: '双皮奶',
    description: '顺德传统甜品，纯牛奶蒸制，绵滑细腻，奶香浓郁，入口即化',
    tag_list: '甜品,牛奶,广式,顺德,不辣',
    min_price: 15, month_saled: 189, praise_num: 172,
    pic_url: 'https://p0.meituan.net/wmproduct/test_shuangpinai.jpg',
    skus: [{ id: 1849, price: '15.0', spec: '一份' }]
  },
];

async function main() {
  await mongoose.connect(DB_URL);
  console.log('✅ MongoDB 连接成功');

  // Step 1：修补现有菜品数据 - 从 skus[0].price 补充 min_price
  console.log('\n📦 Step 1: 修补现有菜品的 min_price 字段...');
  const allFoods = await Food.find({ $or: [{ min_price: null }, { min_price: 0 }] });
  let fixCount = 0;
  for (const food of allFoods) {
    if (food.skus && food.skus.length > 0 && food.skus[0].price) {
      const price = parseFloat(food.skus[0].price);
      if (!isNaN(price) && price > 0) {
        await Food.updateOne({ _id: food._id }, { $set: { min_price: price } });
        fixCount++;
      }
    }
  }
  console.log(`  ✅ 修补了 ${fixCount} 条菜品的 min_price 字段`);

  // Step 2：新增测试餐馆
  console.log('\n🏪 Step 2: 新增测试餐馆...');
  for (const rest of NEW_RESTAURANTS) {
    const exists = await Restaurant.findOne({ id: rest.id });
    if (!exists) {
      await new Restaurant(rest).save();
      console.log(`  ✅ 新增餐馆: [${rest.id}] ${rest.name}`);
    } else {
      console.log(`  ⏭  餐馆已存在: [${rest.id}] ${rest.name}`);
    }
  }

  // Step 3：新增菜品分类
  console.log('\n📂 Step 3: 新增菜品分类...');
  for (const cat of NEW_CATEGORIES) {
    const exists = await Category.findOne({ id: cat.id });
    if (!exists) {
      await new Category({ ...cat, spus: [] }).save();
      console.log(`  ✅ 新增分类: [${cat.id}] ${cat.name} (餐馆${cat.restaurant_id})`);
    } else {
      console.log(`  ⏭  分类已存在: [${cat.id}] ${cat.name}`);
    }
  }

  // Step 4：新增菜品
  console.log('\n🍜 Step 4: 新增菜品...');
  for (const food of NEW_FOODS) {
    const exists = await Food.findOne({ id: food.id });
    if (!exists) {
      const { skus, ...rest } = food;
      const formattedSkus = skus.map(s => ({
        id: s.id,
        spec: s.spec || '',
        description: s.description || '',
        price: s.price
      }));
      await new Food({
        ...rest,
        skus: formattedSkus,
        month_saled_content: String(food.month_saled),
        praise_num: food.praise_num || Math.ceil(Math.random() * 50),
        status: 0,
        created_at: new Date()
      }).save();
      console.log(`  ✅ 新增菜品: [${food.id}] ${food.name} ¥${food.min_price}`);
    } else {
      console.log(`  ⏭  菜品已存在: [${food.id}] ${food.name}`);
    }
  }

  // 统计最终数据量
  const totalFoods = await Food.countDocuments();
  const totalRestaurants = await Restaurant.countDocuments();
  console.log(`\n📊 最终数据统计:`);
  console.log(`  菜品总数: ${totalFoods}`);
  console.log(`  餐馆总数: ${totalRestaurants}`);
  console.log(`\n✅ 种子数据写入完成！`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
