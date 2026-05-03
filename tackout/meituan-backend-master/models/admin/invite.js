import mongoose from 'mongoose'

const inviteSchema = new mongoose.Schema({
  inviter_id: { type: Number, required: true },
  invitee_id: { type: Number, required: true, unique: true }, // 每人只能被一人邀请
  status: { type: String, enum: ['pending', 'rewarded'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
})
inviteSchema.index({ inviter_id: 1 })
inviteSchema.index({ invitee_id: 1 })

const Invite = mongoose.model('Invite', inviteSchema)
export default Invite
