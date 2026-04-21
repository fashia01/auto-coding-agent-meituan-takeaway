import mongoose from 'mongoose'

const Schema = mongoose.Schema;

// 用户口味行为日志
const tasteLogSchema = new Schema({
  user_id: {type: Number, required: true},           // 用户ID
  signal_type: {                                      // 信号来源类型
    type: String,
    enum: ['order_delivered', 'high_rating'],         // 订单送达/高评分
    required: true
  },
  food_tags: [{type: String}],                        // 本次信号对应的食物标签数组
  price_range: {                                      // 本次消费价格区间
    min: Number,
    max: Number,
    avg: Number
  },
  restaurant_id: {type: Number, default: null},       // 关联餐馆ID
  created_at: {type: Date, default: Date.now}
})

tasteLogSchema.index({user_id: 1, created_at: -1})

const TasteLog = mongoose.model('TasteLog', tasteLogSchema)

export default TasteLog
