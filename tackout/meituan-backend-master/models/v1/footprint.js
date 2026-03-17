import mongoose from 'mongoose'

const Schema = mongoose.Schema;

const footprintSchema = new Schema({
    id: Number,               // 足迹ID
    user_id: Number,           // 用户ID
    restaurant_id: Number,     // 商家ID
    restaurant: {             // 商家信息（冗余存储）
        id: Number,
        name: String,
        pic_url: String,
        wm_poi_score: Number,
        delivery_score: Number
    },
    view_time: {type: Date, default: new Date()}  // 浏览时间
})

footprintSchema.index({user_id: 1, view_time: -1});
footprintSchema.index({user_id: 1, restaurant_id: 1}, {unique: true});

const Footprint = mongoose.model('Footprint', footprintSchema);

export default Footprint
