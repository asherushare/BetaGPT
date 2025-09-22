import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use("/api", chatRoutes);

// Root test route
app.get("/", (req, res) => {
  res.json({
    message: "Server is running",
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await connectDB();
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MongoDB connection (cached for serverless)
let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return; // reuse existing connection
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain a minimum of 5 socket connections
    });
    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    isConnected = false;
    throw err; // Re-throw to handle in middleware
  }
};

// Lazy connection for Vercel (serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    res.status(503).json({ 
      error: 'Database connection failed',
      details: 'Please try again later'
    });
  }
});

// ✅ Export for Vercel
export default app;

// ✅ Local dev: connect immediately and start server
if (process.env.NODE_ENV !== "production") {
  connectDB(); // eager connect locally
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
