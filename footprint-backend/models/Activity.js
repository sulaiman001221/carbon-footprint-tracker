import { Schema, model } from "mongoose";

const activitySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["transport", "food", "energy", "other"],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  co2Emission: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
activitySchema.index({ userId: 1, date: -1 });
activitySchema.index({ date: -1 });

export default model("Activity", activitySchema);
