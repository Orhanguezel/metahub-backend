import mongoose from "mongoose";

/**
 * Connects to MongoDB using MONGO_URI from .env
 */
const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI not defined.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected.");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
};

export { connectDB };
