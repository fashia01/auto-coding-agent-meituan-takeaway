import mongoose from 'mongoose'

const Schema = mongoose.Schema;

const collectionSchema = new Schema({
    id: Number,               // 收藏ID
    user_id: Number,           // 用户ID
    restaurant_id: Number,     // 商家ID
    restaurant: {             // 商家信息（冗余存储）
        id: Number,
        name: String,
        pic_url: String,
        wm_poi_score: Number,
        delivery_score: Number,
        delivery_time_tip: String,
        shipping_fee: Number
    },
    create_time: {type: Date, default: new Date()}  // 收藏时间
})

collectionSchema.index({user_id: 1, create_time: -1});
collectionSchema.index({user_id: 1, restaurant_id: 1}, {unique: true}); // 防止重复收藏

const Collection = mongoose.model('Collection', collectionSchema);

export default Collection
