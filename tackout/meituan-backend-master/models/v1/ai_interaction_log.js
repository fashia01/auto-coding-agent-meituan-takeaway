import mongoose from 'mongoose'

const Schema = mongoose.Schema

const aiInteractionLogSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  user_id: { type: Number, default: null },
  session_id: { type: String, default: '' },
  event_type: {
    type: String,
    enum: ['chat_start', 'tool_call', 'recommendation_shown', 'recommendation_adopted', 'order_placed'],
    required: true
  },
  tool_name: { type: String, default: '' },   // tool_call 时填写
  metadata: { type: Object, default: {} },
  created_at: { type: Date, default: Date.now }
})

aiInteractionLogSchema.index({ user_id: 1, event_type: 1, created_at: -1 })
aiInteractionLogSchema.index({ session_id: 1, event_type: 1 })

const AIInteractionLog = mongoose.model('AIInteractionLog', aiInteractionLogSchema)

export default AIInteractionLog
