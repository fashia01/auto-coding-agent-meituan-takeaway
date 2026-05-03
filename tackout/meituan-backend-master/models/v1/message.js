import mongoose from 'mongoose'

const Schema = mongoose.Schema

const messageSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  user_id: { type: Number, required: true },
  category: { type: String, enum: ['order', 'coupon', 'ai', 'system'], required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  is_read: { type: Boolean, default: false },
  related_type: { type: String, default: '' },   // 'order' | 'coupon' | ''
  related_id: { type: Number, default: null },
  created_at: { type: Date, default: Date.now }
})

messageSchema.index({ user_id: 1, is_read: 1 })
messageSchema.index({ user_id: 1, category: 1 })
messageSchema.index({ user_id: 1, related_type: 1, related_id: 1, category: 1 })

const Message = mongoose.model('Message', messageSchema)

export default Message
