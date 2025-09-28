import mongoose from "mongoose";

const insightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["tip", "analysis", "achievement", "warning"],
    required: true,
  },
  category: {
    type: String,
    enum: ["transport", "food", "energy", "other", "overall"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  validUntil: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Index for efficient queries
insightSchema.index({ userId: 1, createdAt: -1 })
insightSchema.index({ validUntil: 1 })
insightSchema.index({ isRead: 1 })

export default mongoose.model("Insight", insightSchema) 