import express from "express";
import Goal from "../models/Goal.js";
import Activity from "../models/Activity.js";
import auth from "../middleware/auth.js";
import { updateGoalProgress } from "../services/insightService.js";

const router = express.Router();

// Get user goals
router.get("/", auth, async (req, res) => {
  try {
    const { status = "active", type = "weekly" } = req.query;

    const query = { userId: req.user._id };
    if (status !== "all") query.status = status;
    if (type !== "all") query.type = type;

    const goals = await Goal.find(query).sort({ createdAt: -1 });

    // Update progress for active goals
    if (status === "active") {
      await updateGoalProgress(req.user._id);
      // Refetch goals after progress update
      const updatedGoals = await Goal.find(query).sort({ createdAt: -1 });
      return res.json(updatedGoals);
    }

    res.json(goals);
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ message: "Server error fetching goals" });
  }
});

// Create new goal
router.post("/", auth, async (req, res) => {
  try {
    const { type, targetReduction, category, duration } = req.body;

    // Validation
    if (!type || !targetReduction || !category) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    if (targetReduction <= 0) {
      return res
        .status(400)
        .json({ message: "Target reduction must be greater than 0" });
    }

    // Check for existing active goal of same type
    const existingGoal = await Goal.findOne({
      userId: req.user._id,
      type,
      status: "active",
      endDate: { $gt: new Date() },
    });

    if (existingGoal) {
      return res
        .status(400)
        .json({ message: `You already have an active ${type} goal` });
    }

    const startDate = new Date();
    const endDate = new Date();

    if (type === "weekly") {
      endDate.setDate(startDate.getDate() + 7);
    } else if (type === "monthly") {
      endDate.setMonth(startDate.getMonth() + 1);
    }

    const goal = new Goal({
      userId: req.user._id,
      type,
      targetReduction,
      category,
      startDate,
      endDate,
    });

    await goal.save();

    // Send real-time update
    req.io.to(`user-${req.user._id}`).emit("goal-created", goal);

    res.status(201).json(goal);
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ message: "Server error creating goal" });
  }
});

// Update goal
router.patch("/:id", auth, async (req, res) => {
  try {
    const { targetReduction, status } = req.body;

    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    if (targetReduction !== undefined) {
      if (targetReduction <= 0) {
        return res
          .status(400)
          .json({ message: "Target reduction must be greater than 0" });
      }
      goal.targetReduction = targetReduction;
    }

    if (status !== undefined) {
      goal.status = status;
    }

    await goal.save();

    // Send real-time update
    req.io.to(`user-${req.user._id}`).emit("goal-updated", goal);

    res.json(goal);
  } catch (error) {
    console.error("Update goal error:", error);
    res.status(500).json({ message: "Server error updating goal" });
  }
});

// Delete goal
router.delete("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await Goal.findByIdAndDelete(req.params.id);

    // Send real-time update
    req.io
      .to(`user-${req.user._id}`)
      .emit("goal-deleted", { goalId: req.params.id });

    res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Delete goal error:", error);
    res.status(500).json({ message: "Server error deleting goal" });
  }
});

// Get goal progress details
router.get("/:id/progress", auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    // Get activities for the goal period
    const activities = await Activity.find({
      userId: req.user._id,
      date: { $gte: goal.startDate, $lte: new Date() },
      ...(goal.category !== "overall" && { category: goal.category }),
    }).sort({ date: -1 });

    // Calculate daily progress
    const dailyProgress = {};
    activities.forEach((activity) => {
      const date = activity.date.toISOString().split("T")[0];
      dailyProgress[date] = (dailyProgress[date] || 0) + activity.co2Emission;
    });

    res.json({
      goal,
      activities,
      dailyProgress,
      progressPercentage: Math.min(
        100,
        (goal.currentProgress / goal.targetReduction) * 100
      ),
    });
  } catch (error) {
    console.error("Get goal progress error:", error);
    res.status(500).json({ message: "Server error fetching goal progress" });
  }
});

export default router;
