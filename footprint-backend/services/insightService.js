import Activity from "../models/Activity.js";
import Insight from "../models/Insight.js";
import Goal from "../models/Goal.js";
import User from "../models/User.js";

// Tip templates for different categories and scenarios
const TIP_TEMPLATES = {
  transport: {
    high: [
      "Try cycling or walking for short trips this week to reduce {amount} kg CO2",
      "Consider carpooling or public transport to cut your transport emissions by {amount} kg CO2",
      "Work from home 2 days this week to save approximately {amount} kg CO2",
      "Combine multiple errands into one trip to reduce {amount} kg CO2",
    ],
    medium: [
      "Switch to public transport once this week to save {amount} kg CO2",
      "Try walking for trips under 1km to reduce emissions by {amount} kg CO2",
      "Plan your routes efficiently to cut fuel consumption and save {amount} kg CO2",
    ],
    low: [
      "Great job keeping transport emissions low! Maintain this by walking short distances",
      "Your transport footprint is excellent - keep using sustainable options!",
    ],
  },
  food: {
    high: [
      "Try 2 plant-based meals this week to reduce {amount} kg CO2",
      "Replace beef with chicken once this week to save {amount} kg CO2",
      "Buy local produce to cut food transport emissions by {amount} kg CO2",
      "Reduce food waste by meal planning to save {amount} kg CO2",
    ],
    medium: [
      "Try one meatless meal this week to save {amount} kg CO2",
      "Choose seasonal vegetables to reduce {amount} kg CO2",
      "Buy from local farmers markets to cut {amount} kg CO2",
    ],
    low: [
      "Excellent food choices! Your plant-based meals are making a difference",
      "Keep up the sustainable eating habits - you're doing great!",
    ],
  },
  energy: {
    high: [
      "Lower your thermostat by 2°C to save {amount} kg CO2 this week",
      "Unplug devices when not in use to reduce {amount} kg CO2",
      "Switch to LED bulbs to cut energy consumption by {amount} kg CO2",
      "Use cold water for washing to save {amount} kg CO2",
    ],
    medium: [
      "Turn off lights when leaving rooms to save {amount} kg CO2",
      "Use a programmable thermostat to reduce {amount} kg CO2",
      "Air dry clothes instead of using the dryer to cut {amount} kg CO2",
    ],
    low: [
      "Your energy usage is very efficient - keep it up!",
      "Great energy conservation habits - you're leading by example!",
    ],
  },
  other: {
    high: [
      "Reduce single-use plastics to cut {amount} kg CO2 this week",
      "Recycle more items to save {amount} kg CO2",
      "Buy second-hand items to reduce {amount} kg CO2",
      "Use reusable bags and containers to cut {amount} kg CO2",
    ],
    medium: [
      "Start composting to reduce waste emissions by {amount} kg CO2",
      "Choose products with less packaging to save {amount} kg CO2",
      "Repair items instead of replacing to cut {amount} kg CO2",
    ],
    low: [
      "Your waste reduction efforts are paying off - keep it up!",
      "Excellent sustainable lifestyle choices!",
    ],
  },
};

async function analyzeUserEmissions(userId) {
  try {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get user's recent activities
    const weeklyActivities = await Activity.find({
      userId,
      date: { $gte: lastWeek },
    });

    const monthlyActivities = await Activity.find({
      userId,
      date: { $gte: lastMonth },
    });

    // Calculate emissions by category
    const weeklyEmissions = calculateEmissionsByCategory(weeklyActivities);
    const monthlyEmissions = calculateEmissionsByCategory(monthlyActivities);

    // Find highest emission category
    const highestCategory = Object.entries(weeklyEmissions).sort(
      ([, a], [, b]) => b - a
    )[0];

    const analysis = {
      weeklyTotal: Object.values(weeklyEmissions).reduce((a, b) => a + b, 0),
      monthlyTotal: Object.values(monthlyEmissions).reduce((a, b) => a + b, 0),
      weeklyEmissions,
      monthlyEmissions,
      highestCategory: highestCategory ? highestCategory[0] : "transport",
      highestCategoryAmount: highestCategory ? highestCategory[1] : 0,
      activitiesCount: weeklyActivities.length,
    };

    return analysis;
  } catch (error) {
    console.error("Error analyzing user emissions:", error);
    throw error;
  }
}

function calculateEmissionsByCategory(activities) {
  return activities.reduce(
    (acc, activity) => {
      acc[activity.category] =
        (acc[activity.category] || 0) + activity.co2Emission;
      return acc;
    },
    { transport: 0, food: 0, energy: 0, other: 0 }
  );
}

async function generatePersonalizedTip(userId, analysis) {
  try {
    const { highestCategory, highestCategoryAmount, weeklyTotal } = analysis;

    let intensity = "low";
    if (highestCategoryAmount > 20) intensity = "high";
    else if (highestCategoryAmount > 10) intensity = "medium";

    const templates = TIP_TEMPLATES[highestCategory][intensity];
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Calculate potential reduction (10-30% of current emissions)
    const potentialReduction = Math.round(
      highestCategoryAmount * (0.1 + Math.random() * 0.2)
    );

    const tip = template.replace("{amount}", potentialReduction.toFixed(1));

    // Save insight to database
    const insight = new Insight({
      userId,
      type: "tip",
      category: highestCategory,
      title: `${
        highestCategory.charAt(0).toUpperCase() + highestCategory.slice(1)
      } Reduction Tip`,
      message: tip,
      data: {
        currentEmissions: highestCategoryAmount,
        potentialReduction,
        category: highestCategory,
      },
      priority: intensity === "high" ? "high" : "medium",
    });

    await insight.save();
    return insight;
  } catch (error) {
    console.error("Error generating personalized tip:", error);
    throw error;
  }
}

async function generateWeeklyGoal(userId, analysis) {
  try {
    const { weeklyTotal, highestCategory, highestCategoryAmount } = analysis;

    // Check if user already has an active weekly goal
    const existingGoal = await Goal.findOne({
      userId,
      type: "weekly",
      status: "active",
      endDate: { $gt: new Date() },
    });

    if (existingGoal) {
      return existingGoal;
    }

    // Create new weekly goal (5-15% reduction)
    const reductionPercentage = 0.05 + Math.random() * 0.1;
    const targetReduction = Math.round(weeklyTotal * reductionPercentage);

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const goal = new Goal({
      userId,
      type: "weekly",
      targetReduction,
      category: highestCategory,
      startDate,
      endDate,
    });

    await goal.save();

    // Create insight for the new goal
    const goalInsight = new Insight({
      userId,
      type: "analysis",
      category: "overall",
      title: "New Weekly Goal Set!",
      message: `Try to reduce your ${highestCategory} emissions by ${targetReduction.toFixed(
        1
      )} kg CO2 this week`,
      data: {
        goalId: goal._id,
        targetReduction,
        category: highestCategory,
      },
      priority: "high",
    });

    await goalInsight.save();
    return goal;
  } catch (error) {
    console.error("Error generating weekly goal:", error);
    throw error;
  }
}

async function updateGoalProgress(userId) {
  try {
    const activeGoals = await Goal.find({
      userId,
      status: "active",
      endDate: { $gt: new Date() },
    });

    for (const goal of activeGoals) {
      const activities = await Activity.find({
        userId,
        date: { $gte: goal.startDate, $lte: new Date() },
        ...(goal.category !== "overall" && { category: goal.category }),
      });

      const currentEmissions = activities.reduce(
        (sum, activity) => sum + activity.co2Emission,
        0
      );

      // Calculate baseline (previous period emissions)
      const baselineStart = new Date(
        goal.startDate.getTime() -
          (goal.endDate.getTime() - goal.startDate.getTime())
      );
      const baselineActivities = await Activity.find({
        userId,
        date: { $gte: baselineStart, $lt: goal.startDate },
        ...(goal.category !== "overall" && { category: goal.category }),
      });

      const baselineEmissions = baselineActivities.reduce(
        (sum, activity) => sum + activity.co2Emission,
        0
      );
      const actualReduction = Math.max(0, baselineEmissions - currentEmissions);

      goal.currentProgress = actualReduction;
      await goal.save();

      // Check if goal is completed
      if (actualReduction >= goal.targetReduction) {
        goal.status = "completed";
        await goal.save();

        // Create achievement insight
        const achievement = new Insight({
          userId,
          type: "achievement",
          category: goal.category,
          title: "Goal Achieved! 🎉",
          message: `Congratulations! You've reduced your ${
            goal.category
          } emissions by ${actualReduction.toFixed(1)} kg CO2`,
          data: {
            goalId: goal._id,
            actualReduction,
            targetReduction: goal.targetReduction,
          },
          priority: "high",
        });

        await achievement.save();
      }
    }
  } catch (error) {
    console.error("Error updating goal progress:", error);
    throw error;
  }
}

async function generateWeeklyInsights(io) {
  try {
    const users = await User.find({});

    for (const user of users) {
      const analysis = await analyzeUserEmissions(user._id);

      if (analysis.activitiesCount > 0) {
        const tip = await generatePersonalizedTip(user._id, analysis);
        const goal = await generateWeeklyGoal(user._id, analysis);

        // Send real-time notification via WebSocket
        io.to(`user-${user._id}`).emit("new-insight", {
          type: "weekly-analysis",
          tip,
          goal,
          analysis,
        });
      }
    }

    console.log("Weekly insights generated for all users");
  } catch (error) {
    console.error("Error generating weekly insights:", error);
  }
}

export {
  analyzeUserEmissions,
  generatePersonalizedTip,
  generateWeeklyGoal,
  updateGoalProgress,
  generateWeeklyInsights,
};
