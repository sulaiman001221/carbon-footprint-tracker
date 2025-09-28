import express from "express";
import Insight from "../models/Insight.js";
import auth from "../middleware/auth.js";
import {
  analyzeUserEmissions,
  generatePersonalizedTip,
  updateGoalProgress,
} from "../services/insightService.js";

const router = express.Router();

// Get user insights
router.get("/", auth, async (req, res) => {
  try {
    const { limit = 10, unreadOnly = false } = req.query;

    const query = {
      userId: req.user._id,
      validUntil: { $gt: new Date() },
    };

    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const insights = await Insight.find(query)
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit));

    res.json(insights);
  } catch (error) {
    console.error("Get insights error:", error);
    res.status(500).json({ message: "Server error fetching insights" });
  }
});

// Mark insight as read
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const insight = await Insight.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!insight) {
      return res.status(404).json({ message: "Insight not found" });
    }

    insight.isRead = true;
    await insight.save();

    res.json({ message: "Insight marked as read" });
  } catch (error) {
    console.error("Mark insight read error:", error);
    res.status(500).json({ message: "Server error updating insight" });
  }
});

// Generate new analysis and tip
router.post("/analyze", auth, async (req, res) => {
  try {
    // Update goal progress first
    await updateGoalProgress(req.user._id);

    // Generate new analysis
    const analysis = await analyzeUserEmissions(req.user._id);
    const tip = await generatePersonalizedTip(req.user._id, analysis);

    // Send real-time update via WebSocket
    req.io.to(`user-${req.user._id}`).emit("new-insight", {
      type: "analysis",
      tip,
      analysis,
    });

    res.json({
      analysis,
      tip,
      message: "Analysis completed successfully",
    });
  } catch (error) {
    console.error("Generate analysis error:", error);
    res.status(500).json({ message: "Server error generating analysis" });
  }
});

// Get real-time tip
router.get("/live-tip", auth, async (req, res) => {
  try {
    const latestTip = await Insight.findOne({
      userId: req.user._id,
      type: "tip",
      validUntil: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!latestTip) {
      // Generate a new tip if none exists
      const analysis = await analyzeUserEmissions(req.user._id);
      const tip = await generatePersonalizedTip(req.user._id, analysis);
      return res.json(tip);
    }

    res.json(latestTip);
  } catch (error) {
    console.error("Get live tip error:", error);
    res.status(500).json({ message: "Server error fetching live tip" });
  }
});

export default router;
