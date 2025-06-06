import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { connectDB } from "@/core/config/connect";
import { ModuleSetting } from "@/modules/admin";


const envProfile = process.env.APP_ENV;
if (!envProfile) {
  throw new Error("❌ APP_ENV is not defined. Please set it before running this script.");
}

const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (!fs.existsSync(envPath)) {
  throw new Error(`❌ Environment file not found: ${envPath}`);
}

dotenv.config({ path: envPath });
console.log(`🌱 Loaded env from: ${envPath}`);

const runMigration = async () => {
  await connectDB();

  const allModules = await ModuleSetting.find();

  for (const mod of allModules) {
    if (typeof mod.label === "string") {
      const newLabel = {
        tr: mod.label,
        en: mod.label,
        de: mod.label,
      };

      mod.label = newLabel as any;

      await mod.save();
      console.log(`✅ Migrated: ${mod.module}`);
    } else {
      console.log(`✔️ Already migrated: ${mod.module}`);
    }
  }

  mongoose.connection.close();
};

runMigration().catch((err) => {
  console.error("❌ Migration error:", err);
  mongoose.connection.close();
});
