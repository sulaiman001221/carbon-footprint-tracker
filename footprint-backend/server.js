import express, { json } from "express";
import http from "http";
import cron from "node-cron";
import { Server } from "socket.io";
import { connect } from "mongoose";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { join, dirname } from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

import authRoutes from "./routes/auth.js";
import activityRoutes from "./routes/activities.js";
import dashboardRoutes from "./routes/dashboard.js";
import insightsRoutes from "./routes/insights.js";
import goalsRoutes from "./routes/goals.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(json());
app.use(express.static(join(__dirname, "../public")));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Connect to MongoDB
connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/goals", goalsRoutes);

// Serve frontend
app.get("/", (_req, res) => {
  res.sendFile(join(__dirname, "../public", "index.html"));
});

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-user", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Weekly analysis cron job (runs every Sunday at 9 AM)
cron.schedule("0 9 * * 0", async () => {
  console.log("Running weekly analysis...");
  try {
    const { generateWeeklyInsights } = require("./services/insightService");
    await generateWeeklyInsights(io);
  } catch (error) {
    console.error("Weekly analysis error:", error);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
