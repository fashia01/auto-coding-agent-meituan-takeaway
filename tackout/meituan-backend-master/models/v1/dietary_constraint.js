import mongoose from 'mongoose'

const Schema = mongoose.Schema

const dietaryConstraintSchema = new Schema({
  user_id: { type: Number, required: true, unique: true },
  calories_limit: { type: Number, default: 0 },          // 0 = 不限制
  exclude_ingredients: { type: [String], default: [] },  // 过敏原/不喜欢食材
  diet_mode: { type: String, enum: ['normal', 'light', 'keto', 'vegetarian'], default: 'normal' },
  updated_at: { type: Date, default: Date.now }
})

dietaryConstraintSchema.index({ user_id: 1 }, { unique: true })

const DietaryConstraint = mongoose.model('DietaryConstraint', dietaryConstraintSchema)

export default DietaryConstraint
