import mongoose from "mongoose";
import dotenv from "dotenv";
import ModuleSetting from "@/modules/admin/moduleSettings.model";
import connectDB from "@/core/config/connect";

dotenv.config({ path: `.env.ensotek` });

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
