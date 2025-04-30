// src/scripts/seedAvailableSettingKeys.ts

import mongoose from "mongoose";
import "../core/config/env";
import connectDB from "../core/config/connect";
import AvailableSettingKey from "../modules/setting/availableSettingKey.model"; // absolute import çalışıyorsa
// Eğer absolute import çalışmazsa: 
// import AvailableSettingKey from "../modules/setting/availableSettingKey.model";

connectDB();

const MONGO_URI = process.env.MONGO_URI as string;

const seedAvailableSettingKeys = async () => {
  try {
    if (!MONGO_URI) throw new Error("MONGO_URI is missing in environment variables.");

    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");

    const keys = [
      { key: "site_name", isMultiLang: true },
      { key: "site_slogan", isMultiLang: true },
      { key: "site_logo", isMultiLang: false },
      { key: "site_favicon", isMultiLang: false },
      { key: "contact_email", isMultiLang: false },
      { key: "contact_phone", isMultiLang: false },
      { key: "contact_address", isMultiLang: false },
      { key: "social_facebook", isMultiLang: false },
      { key: "social_instagram", isMultiLang: false },
      { key: "social_twitter", isMultiLang: false },
      { key: "social_linkedin", isMultiLang: false },
      { key: "social_youtube", isMultiLang: false },
      { key: "seo_title", isMultiLang: true },
      { key: "seo_keywords", isMultiLang: false },
      { key: "site_description", isMultiLang: true },
      { key: "default_language", isMultiLang: false },
      { key: "max_concurrent_bookings", isMultiLang: false },
      { key: "theme_mode", isMultiLang: false },
    ];

    for (const key of keys) {
      const exists = await AvailableSettingKey.findOne({ key: key.key });

      if (!exists) {
        await AvailableSettingKey.create(key);
        console.log(`✅ Inserted: ${key.key}`);
      } else {
        console.log(`ℹ️ Already exists: ${key.key}`);
      }
    }

    console.log("🎯 Seeding completed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
};

seedAvailableSettingKeys();
