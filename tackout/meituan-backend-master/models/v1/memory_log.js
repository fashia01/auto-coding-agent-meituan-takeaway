import mongoose from 'mongoose'

const Schema = mongoose.Schema

const memoryLogSchema = new Schema({
  user_id: { type: Number, required: true },
  summary: { type: String, default: '' },        // LLM 生成的200字摘要
  key_prefs: { type: [String], default: [] },    // 结构化偏好词，如 ['辣', '川菜', '预算≤40']
  session_id: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
})

memoryLogSchema.index({ user_id: 1, created_at: -1 })

const MemoryLog = mongoose.model('MemoryLog', memoryLogSchema)

export default MemoryLog
