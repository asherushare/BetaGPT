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
  res.send("Server is running");
});

// MongoDB connection (cached for serverless)
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return; // reuse existing connection
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.log("Failed to connect to MongoDB", err);
  }
};

// Lazy connection for Vercel (serverless)
app.use(async (req, res, next) => {
  await connectDB();
  next();
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
