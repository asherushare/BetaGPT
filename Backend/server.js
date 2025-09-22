import express from "express";
import "dotenv/config";
import cors from "cors";
import e from "express";
import mongoose from "mongoose";
import chatRoutes from './routes/chat.js';

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(cors());

app.use("/api", chatRoutes);

const connectDB = async() => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch(err) {
    console.log("failed to connect to MongoDB", err);
  }
}


app.post("/test", async (req, res) => {

  // const options = {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     model: "gpt-4o-mini",
  //     messages: [
  //       {
  //         role: "user",
  //         content: req.body.message,
  //       },
  //     ],
  //   }),
  // };

  // try {

  //   const response = await fetch("https://api.openai.com/v1/chat/completions", options);
  //   const data = await response.json();
  //   // console.log(data.choices[0].message.content);
  //   res.send(data.choices[0].message.content);

  // } catch(err) {
  //   console.log(err);
  // }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectDB();
});

