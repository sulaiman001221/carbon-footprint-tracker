import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["weekly", "monthly"],
    default: "weekly",
  },
  targetReduction: {
    type: Number,
    required: true,
    min: 0,
  },
  currentProgress: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    enum: ["transport", "food", "energy", "other", "overall"],
    default: "overall",
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "completed", "failed"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Index for efficient queries
goalSchema.index({ userId: 1, startDate: -1 })
goalSchema.index({ status: 1, endDate: 1 })

export default mongoose.model("Goal", goalSchema)
