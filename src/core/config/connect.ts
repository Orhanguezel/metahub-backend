import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Aktif profil belirle (.env.admin gibi)
const envProfile = process.env.APP_ENV || "ensotek";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

// Eğer config daha önce yüklenmediyse burada yükle
if (!fs.existsSync(envPath)) {
  console.warn(`⚠️ .env.${envProfile} not found, using defaults`);
} else {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded DB environment from ${envPath}`);
}

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI as string;

  if (!uri) {
    console.error("❌ MONGO_URI is not defined in the current environment file.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB!");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
  }
};

export default connectDB;
