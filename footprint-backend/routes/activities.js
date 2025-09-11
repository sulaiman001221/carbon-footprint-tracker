import express from "express";
import Activity from "../models/Activity.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// CO2 emission factors
const EMISSION_FACTORS = {
  "Car Travel": 0.21,
  "Public Transport": 0.05,
  "Flight (Domestic)": 0.25,
  "Flight (International)": 0.3,
  Motorcycle: 0.15,
  "Beef Consumption": 27.0,
  "Pork Consumption": 12.1,
  "Chicken Consumption": 6.9,
  "Fish Consumption": 4.2,
  "Dairy Products": 3.2,
  "Electricity Usage": 0.5,
  "Natural Gas": 2.3,
  "Heating Oil": 2.7,
  Coal: 2.4,
  "Waste Generation": 0.5,
  "Water Usage": 0.0004,
  "Paper Usage": 3.3,
  "Plastic Usage": 6.0,
};

function calculateCO2Emission(activityName, amount, category) {
  const factor = EMISSION_FACTORS[activityName];
  if (!factor) {
    const defaultFactors = {
      transport: 0.2,
      food: 5.0,
      energy: 0.5,
      other: 1.0,
    };
    return amount * (defaultFactors[category] || 1.0);
  }
  return amount * factor;
}

// Get all activities for user
router.get("/", auth, async (req, res) => {
  try {
    const { category, startDate, endDate, limit = 50 } = req.query;

    const query = { userId: req.user._id };

    if (category && category !== "all") {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const activities = await Activity.find(query)
      .sort({ date: -1 })
      .limit(Number.parseInt(limit));

    res.json(activities);
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({ message: "Server error fetching activities" });
  }
});

// Add new activity
router.post("/", auth, async (req, res) => {
  try {
    const { name, category, amount, unit, date } = req.body;

    // Validation
    if (!name || !category || !amount || !unit) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Calculate CO2 emission
    const co2Emission = calculateCO2Emission(name, amount, category);

    const activity = new Activity({
      userId: req.user._id,
      name,
      category,
      amount,
      unit,
      co2Emission,
      date: date ? new Date(date) : new Date(),
    });

    await activity.save();
    res.status(201).json(activity);
  } catch (error) {
    console.error("Add activity error:", error);
    res.status(500).json({ message: "Server error adding activity" });
  }
});

// Delete activity
router.delete("/:id", auth, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    await Activity.findByIdAndDelete(req.params.id);
    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Delete activity error:", error);
    res.status(500).json({ message: "Server error deleting activity" });
  }
});

export default router;
