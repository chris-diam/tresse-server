const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const productRoutes = require("./routes/products");
require("dotenv").config();

const app = express();

// Check CORS configuration in server.js
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "https://tresse.netlify.app", // Add your Netlify domain
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  // Listen on all network interfaces
  console.log(`Server running on port ${PORT}`);
});
