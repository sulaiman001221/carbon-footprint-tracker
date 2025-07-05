// Activity types and their units
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

// CO2 emission factors (kg CO2 per unit)
const EMISSION_FACTORS = {
  // Transport (per km)
  "Car Travel": 0.21,
  "Public Transport": 0.05,
  "Flight (Domestic)": 0.25,
  "Flight (International)": 0.3,
  Motorcycle: 0.15,

  // Food (per kg)
  "Beef Consumption": 27.0,
  "Pork Consumption": 12.1,
  "Chicken Consumption": 6.9,
  "Fish Consumption": 4.2,
  "Dairy Products": 3.2,

  // Energy
  "Electricity Usage": 0.5, // per kWh
  "Natural Gas": 2.3, // per m³
  "Heating Oil": 2.7, // per L
  Coal: 2.4, // per kg

  // Other
  "Waste Generation": 0.5, // per kg
  "Water Usage": 0.0004, // per L
  "Paper Usage": 3.3, // per kg
  "Plastic Usage": 6.0, // per kg
}

let activities = []
let currentFilter = "all"
let categoryChart = null
let trendChart = null

const categorySelect = document.getElementById("category")
const activitySelect = document.getElementById("activity")
const amountInput = document.getElementById("amount")
const unitInput = document.getElementById("unit")
const co2Preview = document.getElementById("co2-preview")
const co2Amount = document.getElementById("co2-amount")
const activityForm = document.getElementById("activity-form")
const activitiesList = document.getElementById("activities-list")
const emptyState = document.getElementById("empty-state")
const totalEmissionsEl = document.getElementById("total-emissions")
const todayEmissionsEl = document.getElementById("today-emissions")
const activitiesCountEl = document.getElementById("activities-count")
const categoryFilters = document.getElementById("category-filters")

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

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

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString()
}

function isToday(dateString) {
  const today = new Date().toDateString()
  const date = new Date(dateString).toDateString()
  return today === date
}

function saveActivities() {
  localStorage.setItem("carbon-activities", JSON.stringify(activities))
}

function loadActivities() {
  const stored = localStorage.getItem("carbon-activities")
  if (stored) {
    try {
      activities = JSON.parse(stored)
    } catch (e) {
      activities = []
    }
  }
}

function populateActivitySelect() {
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

  // Reset dependent fields
  unitInput.value = ""
  updateCO2Preview()
}

function updateUnit() {
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

function handleFormSubmit(e) {
  e.preventDefault()

  const category = categorySelect.value
  const activityName = activitySelect.value
  const amount = Number.parseFloat(amountInput.value)
  const unit = unitInput.value

  if (!category || !activityName || !amount || amount <= 0 || !unit) {
    return
  }

  const co2Emission = calculateCO2Emission(activityName, amount, category)

  const newActivity = {
    id: generateId(),
    name: activityName,
    category,
    amount,
    unit,
    co2Emission,
    date: new Date().toISOString(),
  }

  activities.unshift(newActivity) // Add to beginning
  saveActivities()

  // Reset form
  activityForm.reset()
  activitySelect.disabled = true
  co2Preview.classList.add("hidden")

  // Update UI
  updateSummary()
  renderActivities()
  updateCharts()
}

function renderActivities() {
  const filteredActivities =
    currentFilter === "all" ? activities : activities.filter((activity) => activity.category === currentFilter)

  if (filteredActivities.length === 0) {
    activitiesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No activities logged yet.</p>
                <p class="empty-subtitle">Start tracking your carbon footprint by adding activities!</p>
            </div>
        `
    return
  }

  const categoryIcons = {
    transport: "🚗",
    food: "🍽️",
    energy: "⚡",
    other: "📦",
  }

  activitiesList.innerHTML = filteredActivities
    .map(
      (activity) => `
        <div class="activity-item">
            <div class="activity-header">
                <div class="activity-info">
                    <div class="activity-title">
                        <span class="icon">${categoryIcons[activity.category]}</span>
                        <h3>${activity.name}</h3>
                        <span class="activity-badge ${activity.category}">${activity.category}</span>
                    </div>
                    <div class="activity-meta">
                        <span>📅 ${formatDate(activity.date)}</span>
                        <span>${activity.amount} ${activity.unit}</span>
                    </div>
                </div>
                <div class="activity-actions">
                    <div class="activity-emission">${activity.co2Emission.toFixed(2)} kg CO2</div>
                    <button class="btn btn-danger" onclick="deleteActivity('${activity.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `,
    )
    .join("")
}

function deleteActivity(id) {
  activities = activities.filter((activity) => activity.id !== id)
  saveActivities()
  updateSummary()
  renderActivities()
  updateCharts()
}

function updateSummary() {
  const totalEmissions = activities.reduce((sum, activity) => sum + activity.co2Emission, 0)
  const todayEmissions = activities
    .filter((activity) => isToday(activity.date))
    .reduce((sum, activity) => sum + activity.co2Emission, 0)

  totalEmissionsEl.textContent = `${totalEmissions.toFixed(1)} kg`
  todayEmissionsEl.textContent = `${todayEmissions.toFixed(1)} kg`
  activitiesCountEl.textContent = activities.length.toString()
}

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
    renderActivities()
  }
}

function updateCharts() {
  updateCategoryChart()
  updateTrendChart()
}

function updateCategoryChart() {
  const categoryData = activities.reduce((acc, activity) => {
    acc[activity.category] = (acc[activity.category] || 0) + activity.co2Emission
    return acc
  }, {})

  const labels = Object.keys(categoryData).map((cat) => cat.charAt(0).toUpperCase() + cat.slice(1))
  const data = Object.values(categoryData)
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"]

  const ctx = document.getElementById("category-chart").getContext("2d")

  if (categoryChart) {
    categoryChart.destroy()
  }

  if (data.length === 0) {
    return
  }

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${context.parsed.toFixed(2)} kg CO2`,
          },
        },
      },
    },
  })
}

function updateTrendChart() {
  const dailyData = activities.reduce((acc, activity) => {
    const date = activity.date.split("T")[0] // Get date part only
    acc[date] = (acc[date] || 0) + activity.co2Emission
    return acc
  }, {})

  const sortedDates = Object.keys(dailyData).sort()
  const labels = sortedDates.map((date) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })
  const data = sortedDates.map((date) => dailyData[date])

  const ctx = document.getElementById("trend-chart").getContext("2d")

  if (trendChart) {
    trendChart.destroy()
  }

  if (data.length === 0) {
    return
  }

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Daily Emissions",
          data: data,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
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
          callbacks: {
            label: (context) => `${context.parsed.y.toFixed(2)} kg CO2`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "CO2 Emissions (kg)",
          },
        },
      },
    },
  })
}

categorySelect.addEventListener("change", populateActivitySelect)
activitySelect.addEventListener("change", updateUnit)
amountInput.addEventListener("input", updateCO2Preview)
activityForm.addEventListener("submit", handleFormSubmit)
categoryFilters.addEventListener("click", handleFilterClick)

function initApp() {
  loadActivities()
  updateSummary()
  renderActivities()
  updateCharts()
}

document.addEventListener("DOMContentLoaded", initApp)
