import express from "express";
import Activity from "../models/Activity.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Get user dashboard data
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User's total emissions
    const totalEmissions = await Activity.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$co2Emission" } } },
    ]);

    // User's weekly emissions
    const weeklyEmissions = await Activity.aggregate([
      { $match: { userId, date: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: "$co2Emission" } } },
    ]);

    // User's monthly emissions
    const monthlyEmissions = await Activity.aggregate([
      { $match: { userId, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$co2Emission" } } },
    ]);

    // User's category breakdown
    const categoryBreakdown = await Activity.aggregate([
      { $match: { userId } },
      { $group: { _id: "$category", total: { $sum: "$co2Emission" } } },
    ]);

    // Community averages
    const communityStats = await Activity.aggregate([
      {
        $group: {
          _id: "$userId",
          totalEmissions: { $sum: "$co2Emission" },
        },
      },
      {
        $group: {
          _id: null,
          avgEmissions: { $avg: "$totalEmissions" },
          totalUsers: { $sum: 1 },
        },
      },
    ]);

    // Weekly streak calculation
    const weeklyActivities = await Activity.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            week: { $week: "$date" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.week": -1 } },
    ]);

    // Calculate streak
    let currentStreak = 0;
    const currentWeek = Math.ceil((now.getDate() - now.getDay()) / 7);
    const currentYear = now.getFullYear();

    for (let i = 0; i < weeklyActivities.length; i++) {
      const activity = weeklyActivities[i];
      const expectedWeek = currentWeek - i;
      const expectedYear = currentYear;

      if (
        activity._id.week === expectedWeek &&
        activity._id.year === expectedYear
      ) {
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({
      userStats: {
        totalEmissions: totalEmissions[0]?.total || 0,
        weeklyEmissions: weeklyEmissions[0]?.total || 0,
        monthlyEmissions: monthlyEmissions[0]?.total || 0,
        categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
          acc[item._id] = item.total;
          return acc;
        }, {}),
        weeklyStreak: currentStreak,
      },
      communityStats: {
        averageEmissions: communityStats[0]?.avgEmissions || 0,
        totalUsers: communityStats[0]?.totalUsers || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error fetching dashboard stats" });
  }
});

// Get leaderboard
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const { period = "month", limit = 10 } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "week": {
        const startOfWeek = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay()
        );
        dateFilter = { date: { $gte: startOfWeek } };
        break;
      }
      case "month": {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { date: { $gte: startOfMonth } };
        break;
      }
      case "year": {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { date: { $gte: startOfYear } };
        break;
      }
      default:
        dateFilter = {};
    }

    const leaderboard = await Activity.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$userId",
          totalEmissions: { $sum: "$co2Emission" },
          activityCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          username: "$user.username",
          totalEmissions: 1,
          activityCount: 1,
          avgEmissionPerActivity: {
            $divide: ["$totalEmissions", "$activityCount"],
          },
        },
      },
      { $sort: { totalEmissions: 1 } }, // Lowest emissions first
      { $limit: Number.parseInt(limit) },
    ]);

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error fetching leaderboard" });
  }
});

// Get weekly summary
router.get("/weekly-summary", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { weeks = 8 } = req.query;

    const weeklySummary = await Activity.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            week: { $week: "$date" },
          },
          totalEmissions: { $sum: "$co2Emission" },
          activityCount: { $sum: 1 },
          categories: {
            $push: {
              category: "$category",
              emissions: "$co2Emission",
            },
          },
        },
      },
      {
        $addFields: {
          categoryBreakdown: {
            $reduce: {
              input: "$categories",
              initialValue: {},
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    $arrayToObject: [
                      [
                        {
                          k: "$$this.category",
                          v: {
                            $add: [
                              {
                                $ifNull: [
                                  {
                                    $getField: {
                                      field: "$$this.category",
                                      input: "$$value",
                                    },
                                  },
                                  0,
                                ],
                              },
                              "$$this.emissions",
                            ],
                          },
                        },
                      ],
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { "_id.year": -1, "_id.week": -1 } },
      { $limit: Number.parseInt(weeks) },
    ]);

    res.json(weeklySummary);
  } catch (error) {
    console.error("Weekly summary error:", error);
    res.status(500).json({ message: "Server error fetching weekly summary" });
  }
});

export default router;
