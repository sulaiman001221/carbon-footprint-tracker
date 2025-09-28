# Carbon Footprint Logger 🌍

Track and log your daily carbon footprint using this simple Node.js + Express + MongoDB app.

## 🚀 Live Demo
👉 [Carbon Footprint Logger](https://carbon-footprint-logger.onrender.com/)

---

## 📦 Features
- Log daily activities with estimated carbon emissions
- View history of logged activities
- Simple and clean interface
- MongoDB Atlas backend for data persistence
- Deployed on Render

---

## 🛠️ Tech Stack
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas + Mongoose
- **Frontend:** EJS templates, CSS
- **Deployment:** Render

---

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sulaiman001221/carbon-footprint-tracker.git
   cd carbon-footprint-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the root directory
   - Add your MongoDB connection string:
     ```env
     MONGODB_UR=mongodb+srv://<username>:<password>@cluster0.mongodb.net/footprint
     JWT_SECRET=your_secret
     PORT=3000
     NODE_ENV=development
     ```

4. **Run the app**
   ```bash
   npm run dev
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure
```
footprint-backend/
├── models/          # Mongoose models
├── routes/          # Express routes
├── middleware/      # auth middleware                   
├── server.js        # App entry point
├── package.json
└── .env.example
public/             # Static assets (HTML, CSS, JS)
```

---

## 🌱 Future Improvements
- Export activity logs (CSV / PDF)
- Real time analytics on home page
---

## 📝 License
This project is licensed under the Apache License.
