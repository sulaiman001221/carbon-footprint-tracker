//import { Chart } from "@/components/ui/chart"
// API Configuration
const API_BASE = "/api"

// Global state
let currentUser = null
let authToken = localStorage.getItem("authToken")
let weeklyChart = null
let currentFilter = "all"

// Activity types and emission factors
const ACTIVITY_TYPES = {
  transport: [
    { name: "Car Travel", unit: "km" },
    { name: "Public Transport", unit: "km" },
    { name: "Flight (Domestic)", unit: "km" },
    { name: "Flight (International)", unit: "km" },
    { name: "Motorcycle", unit: "km" },
  ],
  food: [
    { name: "Beef Consumption", unit: "kg" },
    { name: "Pork Consumption", unit: "kg" },
    { name: "Chicken Consumption", unit: "kg" },
    { name: "Fish Consumption", unit: "kg" },
    { name: "Dairy Products", unit: "kg" },
  ],
  energy: [
    { name: "Electricity Usage", unit: "kWh" },
    { name: "Natural Gas", unit: "m³" },
    { name: "Heating Oil", unit: "L" },
    { name: "Coal", unit: "kg" },
  ],
  other: [
    { name: "Waste Generation", unit: "kg" },
    { name: "Water Usage", unit: "L" },
    { name: "Paper Usage", unit: "kg" },
    { name: "Plastic Usage", unit: "kg" },
  ],
}

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
}

// DOM Elements
const authModal = document.getElementById("auth-modal")
const authForm = document.getElementById("auth-form")
const authTitle = document.getElementById("auth-title")
const authSubmit = document.getElementById("auth-submit")
const authSwitchText = document.getElementById("auth-switch-text")
const authSwitchLink = document.getElementById("auth-switch-link")
const usernameGroup = document.getElementById("username-group")
const loginBtn = document.getElementById("login-btn")
const registerBtn = document.getElementById("register-btn")
const logoutBtn = document.getElementById("logout-btn")
const userInfo = document.getElementById("user-info")
const authButtons = document.getElementById("auth-buttons")
const usernameDisplay = document.getElementById("username-display")
const welcomeSection = document.getElementById("welcome-section")
const dashboard = document.getElementById("dashboard")
const getStartedBtn = document.getElementById("get-started-btn")

// API Helper Functions
async function apiCall(endpoint, options = {}) {
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
    ...options,
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "API request failed")
    }

    return data
  } catch (error) {
    console.error("API Error:", error)
    throw error
  }
}

// Authentication Functions
async function login(email, password) {
  try {
    const data = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    authToken = data.token
    localStorage.setItem("authToken", authToken)
    currentUser = data.user

    updateAuthUI()
    closeModal()
    showDashboard()
    await loadDashboardData()

    showNotification("Welcome back! 🎉", "success")
  } catch (error) {
    showNotification(error.message, "error")
  }
}

async function register(username, email, password) {
  try {
    const data = await apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    })

    authToken = data.token
    localStorage.setItem("authToken", authToken)
    currentUser = data.user

    updateAuthUI()
    closeModal()
    showDashboard()
    await loadDashboardData()

    showNotification("Welcome to the community! 🌱", "success")
  } catch (error) {
    showNotification(error.message, "error")
  }
}

function logout() {
  authToken = null
  currentUser = null
  localStorage.removeItem("authToken")

  updateAuthUI()
  showWelcome()

  showNotification("See you later! 👋", "info")
}

async function checkAuth() {
  if (!authToken) return false

  try {
    const data = await apiCall("/auth/me")
    currentUser = data.user
    updateAuthUI()
    showDashboard()
    await loadDashboardData()
    return true
  } catch (error) {
    logout()
    return false
  }
}

// UI Functions
function updateAuthUI() {
  if (currentUser) {
    userInfo.classList.remove("hidden")
    authButtons.classList.add("hidden")
    usernameDisplay.textContent = currentUser.username
  } else {
    userInfo.classList.add("hidden")
    authButtons.classList.remove("hidden")
  }
}

function showWelcome() {
  welcomeSection.classList.remove("hidden")
  dashboard.classList.add("hidden")
  loadWelcomeStats()
}

function showDashboard() {
  welcomeSection.classList.add("hidden")
  dashboard.classList.remove("hidden")
}

function openModal(isRegister = false) {
  authModal.style.display = "block"

  if (isRegister) {
    authTitle.textContent = "Register"
    authSubmit.textContent = "Register"
    authSwitchText.innerHTML = 'Already have an account? <a href="#" id="auth-switch-link">Login</a>'
    usernameGroup.classList.remove("hidden")
  } else {
    authTitle.textContent = "Login"
    authSubmit.textContent = "Login"
    authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-switch-link">Register</a>'
    usernameGroup.classList.add("hidden")
  }

  // Re-attach event listener for the new switch link
  document.getElementById("auth-switch-link").addEventListener("click", (e) => {
    e.preventDefault()
    openModal(!isRegister)
  })
}

function closeModal() {
  authModal.style.display = "none"
  authForm.reset()
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`

  // Add icon based on type
  let icon = "ℹ️"
  if (type === "success") icon = "✅"
  else if (type === "error") icon = "❌"

  notification.innerHTML = `
    <span>${icon}</span>
    <span>${message}</span>
  `

  const container = document.getElementById("notification-container")
  container.appendChild(notification)

  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease"
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 300)
  }, 4000)
}

// Welcome Stats
async function loadWelcomeStats() {
  try {
    // Mock stats for welcome page. Feature to be implemented in the future.
    document.getElementById("total-users").textContent = "1,247"
    document.getElementById("total-activities").textContent = "15,832"
    document.getElementById("total-emissions").textContent = "2,456"
  } catch (error) {
    console.error("Error loading welcome stats:", error)
  }
}

// Dashboard Functions
async function loadDashboardData() {
  try {
    const [stats, activities] = await Promise.all([apiCall("/dashboard/stats"), apiCall("/activities?limit=20")])

    updateSummaryCards(stats)
    renderActivities(activities)
    await loadWeeklySummary()
    await loadLeaderboard()
  } catch (error) {
    showNotification("Error loading dashboard data", "error")
  }
}

function updateSummaryCards(stats) {
  const userTotal = stats.userStats.totalEmissions
  const userWeekly = stats.userStats.weeklyEmissions
  const communityAvg = stats.communityStats.averageEmissions
  const streak = stats.userStats.weeklyStreak

  document.getElementById("user-total-emissions").textContent = `${userTotal.toFixed(1)} kg`
  document.getElementById("user-weekly-emissions").textContent = `${userWeekly.toFixed(1)} kg`
  document.getElementById("community-avg-emissions").textContent = `${communityAvg.toFixed(1)} kg`
  document.getElementById("weekly-streak").textContent = streak.toString()

  // Add comparison text
  const totalComparison = userTotal < communityAvg ? "Below average! 🌱" : "Above average"
  const weeklyComparison = userWeekly === 0 ? "No activities this week" : `${userWeekly.toFixed(1)} kg this week`
  const communityUsers = `${stats.communityStats.totalUsers} total users`
  const streakMessage = streak === 0 ? "Start your streak!" : streak === 1 ? "Keep it up!" : "Great consistency! 🔥"

  document.getElementById("total-comparison").textContent = totalComparison
  document.getElementById("weekly-comparison").textContent = weeklyComparison
  document.getElementById("community-users").textContent = communityUsers
  document.getElementById("streak-message").textContent = streakMessage
}

function renderActivities(activities) {
  const activitiesList = document.getElementById("activities-list")

  // Filter activities based on current filter
  const filteredActivities =
    currentFilter === "all" ? activities : activities.filter((activity) => activity.category === currentFilter)

  if (filteredActivities.length === 0) {
    activitiesList.innerHTML = `
      <div class="empty-state">
        <p>No activities found.</p>
        <p>Start tracking your carbon footprint!</p>
      </div>
    `
    return
  }

  activitiesList.innerHTML = filteredActivities
    .map(
      (activity) => `
    <div class="activity-item">
      <div class="activity-info">
        <h4>${activity.name}</h4>
        <div class="activity-meta">
          <span>📅 ${new Date(activity.date).toLocaleDateString()}</span>
          <span>📏 ${activity.amount} ${activity.unit}</span>
          <span class="activity-category ${activity.category}">${activity.category}</span>
        </div>
      </div>
      <div class="activity-actions">
        <span class="activity-emission">${activity.co2Emission.toFixed(2)} kg CO2</span>
        <button class="btn btn-danger" onclick="deleteActivity('${activity._id}')" title="Delete activity">
          🗑️
        </button>
      </div>
    </div>
  `,
    )
    .join("")
}

async function loadWeeklySummary() {
  try {
    const weeklySummary = await apiCall("/dashboard/weekly-summary")
    renderWeeklyChart(weeklySummary)
    renderWeeklyDetails(weeklySummary)
  } catch (error) {
    console.error("Error loading weekly summary:", error)
  }
}

function renderWeeklyChart(weeklySummary) {
  const ctx = document.getElementById("weekly-chart").getContext("2d")

  if (weeklyChart) {
    weeklyChart.destroy()
  }

  if (weeklySummary.length === 0) {
    ctx.font = "16px Arial"
    ctx.fillStyle = "#6b7280"
    ctx.textAlign = "center"
    ctx.fillText("No data available", ctx.canvas.width / 2, ctx.canvas.height / 2)
    return
  }

  const labels = weeklySummary.map((week) => `Week ${week._id.week}, ${week._id.year}`)
  const data = weeklySummary.map((week) => week.totalEmissions)

  weeklyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.reverse(),
      datasets: [
        {
          label: "Weekly Emissions (kg CO2)",
          data: data.reverse(),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#3b82f6",
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: "#6b7280",
          },
        },
        x: {
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          ticks: {
            color: "#6b7280",
          },
        },
      },
    },
  })
}

function renderWeeklyDetails(weeklySummary) {
  const weeklyDetails = document.getElementById("weekly-details")

  if (weeklySummary.length === 0) {
    weeklyDetails.innerHTML = `
      <div class="empty-state">
        <p>No weekly data available yet.</p>
      </div>
    `
    return
  }

  weeklyDetails.innerHTML = weeklySummary
    .map(
      (week) => `
    <div class="weekly-item">
      <h4>📅 Week ${week._id.week}, ${week._id.year}</h4>
      <p><strong>Total Emissions:</strong> ${week.totalEmissions.toFixed(2)} kg CO2</p>
      <p><strong>Activities:</strong> ${week.activityCount}</p>
      <p><strong>Average per Activity:</strong> ${(week.totalEmissions / week.activityCount).toFixed(2)} kg CO2</p>
      ${
        week.categoryBreakdown
          ? `
        <div style="margin-top: 1rem;">
          <strong>Category Breakdown:</strong>
          ${Object.entries(week.categoryBreakdown || {})
            .map(
              ([category, emissions]) =>
                `<div style="margin-left: 1rem;">• ${category}: ${emissions.toFixed(2)} kg CO2</div>`,
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>
  `,
    )
    .join("")
}

async function loadLeaderboard() {
  try {
    const period = document.getElementById("leaderboard-period").value
    const leaderboard = await apiCall(`/dashboard/leaderboard?period=${period}`)
    renderLeaderboard(leaderboard)
  } catch (error) {
    console.error("Error loading leaderboard:", error)
  }
}

function renderLeaderboard(leaderboard) {
  const leaderboardList = document.getElementById("leaderboard-list")

  if (leaderboard.length === 0) {
    leaderboardList.innerHTML = '<div class="empty-state">No data available for this period</div>'
    return
  }

  leaderboardList.innerHTML = leaderboard
    .map((user, index) => {
      let rankClass = ""
      let rankDisplay = index + 1

      if (index === 0) {
        rankClass = "gold"
        rankDisplay = "🥇"
      } else if (index === 1) {
        rankClass = "silver"
        rankDisplay = "🥈"
      } else if (index === 2) {
        rankClass = "bronze"
        rankDisplay = "🥉"
      }

      const isCurrentUser = currentUser && user.username === currentUser.username

      return `
      <div class="leaderboard-item ${isCurrentUser ? "current-user" : ""}">
        <div class="leaderboard-rank ${rankClass}">
          ${rankDisplay}
        </div>
        <div class="leaderboard-info">
          <div class="leaderboard-username">
            ${user.username} ${isCurrentUser ? "(You)" : ""}
          </div>
          <div class="leaderboard-stats">
            ${user.activityCount} activities • ${user.avgEmissionPerActivity.toFixed(2)} kg CO2 avg
          </div>
        </div>
        <div class="leaderboard-emissions">
          ${user.totalEmissions.toFixed(1)} kg CO2
        </div>
      </div>
    `
    })
    .join("")
}

// Activity Functions
function calculateCO2Emission(activityName, amount, category) {
  const factor = EMISSION_FACTORS[activityName]
  if (!factor) {
    const defaultFactors = {
      transport: 0.2,
      food: 5.0,
      energy: 0.5,
      other: 1.0,
    }
    return amount * (defaultFactors[category] || 1.0)
  }
  return amount * factor
}

function populateActivitySelect() {
  const categorySelect = document.getElementById("category")
  const activitySelect = document.getElementById("activity")
  const category = categorySelect.value

  activitySelect.innerHTML = '<option value="">Select activity</option>'

  if (category && ACTIVITY_TYPES[category]) {
    activitySelect.disabled = false
    ACTIVITY_TYPES[category].forEach((activity) => {
      const option = document.createElement("option")
      option.value = activity.name
      option.textContent = activity.name
      activitySelect.appendChild(option)
    })
  } else {
    activitySelect.disabled = true
  }

  updateUnit()
}

function updateUnit() {
  const categorySelect = document.getElementById("category")
  const activitySelect = document.getElementById("activity")
  const unitInput = document.getElementById("unit")

  const category = categorySelect.value
  const activityName = activitySelect.value

  if (category && activityName && ACTIVITY_TYPES[category]) {
    const activity = ACTIVITY_TYPES[category].find((a) => a.name === activityName)
    if (activity) {
      unitInput.value = activity.unit
    }
  }

  updateCO2Preview()
}

function updateCO2Preview() {
  const categorySelect = document.getElementById("category")
  const activitySelect = document.getElementById("activity")
  const amountInput = document.getElementById("amount")
  const co2Preview = document.getElementById("co2-preview")
  const co2Amount = document.getElementById("co2-amount")

  const category = categorySelect.value
  const activityName = activitySelect.value
  const amount = Number.parseFloat(amountInput.value)

  if (category && activityName && amount && amount > 0) {
    const emission = calculateCO2Emission(activityName, amount, category)
    co2Amount.textContent = emission.toFixed(2)
    co2Preview.classList.remove("hidden")
  } else {
    co2Preview.classList.add("hidden")
  }
}

async function addActivity(activityData) {
  try {
    await apiCall("/activities", {
      method: "POST",
      body: JSON.stringify(activityData),
    })

    showNotification("Activity added successfully! 🌱", "success")
    await loadDashboardData()

    // Reset form
    document.getElementById("activity-form").reset()
    document.getElementById("activity").disabled = true
    document.getElementById("co2-preview").classList.add("hidden")
  } catch (error) {
    showNotification(error.message, "error")
  }
}

async function deleteActivity(activityId) {
  if (!confirm("Are you sure you want to delete this activity?")) return

  try {
    await apiCall(`/activities/${activityId}`, {
      method: "DELETE",
    })

    showNotification("Activity deleted successfully", "success")
    await loadDashboardData()
  } catch (error) {
    showNotification(error.message, "error")
  }
}

// Tab Functions
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active")
  })

  // Remove active class from all tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Show selected tab content
  document.getElementById(`${tabName}-tab`).classList.add("active")

  // Add active class to selected tab button
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

  // Load data for specific tabs
  if (tabName === "weekly") {
    loadWeeklySummary()
  } else if (tabName === "leaderboard") {
    loadLeaderboard()
  }
}

// Filter Functions
function handleFilterClick(e) {
  if (e.target.classList.contains("filter-btn")) {
    // Remove active class from all buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active")
    })

    // Add active class to clicked button
    e.target.classList.add("active")

    // Update current filter
    currentFilter = e.target.dataset.category

    // Re-render activities
    loadDashboardData()
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
  // Check if user is already authenticated
  const isAuthenticated = await checkAuth()

  if (!isAuthenticated) {
    showWelcome()
  }

  // Auth modal events
  document.querySelector(".close").addEventListener("click", closeModal)

  window.addEventListener("click", (e) => {
    if (e.target === authModal) {
      closeModal()
    }
  })

  // Auth form submission
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    const username = document.getElementById("username").value

    if (authTitle.textContent === "Register") {
      if (!username) {
        showNotification("Please enter a username", "error")
        return
      }
      await register(username, email, password)
    } else {
      await login(email, password)
    }
  })

  // Auth buttons
  loginBtn.addEventListener("click", () => openModal(false))
  registerBtn.addEventListener("click", () => openModal(true))
  getStartedBtn.addEventListener("click", () => openModal(true))
  logoutBtn.addEventListener("click", logout)

  // Activity form events
  document.getElementById("category").addEventListener("change", populateActivitySelect)
  document.getElementById("activity").addEventListener("change", updateUnit)
  document.getElementById("amount").addEventListener("input", updateCO2Preview)

  document.getElementById("activity-form").addEventListener("submit", async (e) => {
    e.preventDefault()

    const category = document.getElementById("category").value
    const name = document.getElementById("activity").value
    const amount = Number.parseFloat(document.getElementById("amount").value)
    const unit = document.getElementById("unit").value

    if (!category || !name || !amount || !unit) {
      showNotification("Please fill in all fields", "error")
      return
    }

    if (amount <= 0) {
      showNotification("Amount must be greater than 0", "error")
      return
    }

    await addActivity({ name, category, amount, unit })
  })

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab)
    })
  })

  // Filter buttons
  document.getElementById("category-filters").addEventListener("click", handleFilterClick)

  // Leaderboard period change
  document.getElementById("leaderboard-period").addEventListener("change", loadLeaderboard)
})

// Add CSS animation for slide out
const style = document.createElement("style")
style.textContent = `
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .current-user {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
    border: 2px solid #22c55e !important;
  }
`
document.head.appendChild(style)
