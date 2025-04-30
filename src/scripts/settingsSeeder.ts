import mongoose from "mongoose";
import dotenv from "dotenv";
import Setting from "@/modules/setting/setting.models";

dotenv.config();

const settings = [
  {
    key: "max_concurrent_appointments",
    value: {
      tr: "2",
      en: "2",
      de: "2",
    },
    description: {
      tr: "Aynı anda alınabilecek maksimum randevu sayısı.",
      en: "Maximum number of concurrent appointments.",
      de: "Maximale Anzahl gleichzeitiger Termine.",
    },
    isActive: true,
  },
  {
    key: "default_language",
    value: {
      tr: "tr",
      en: "en",
      de: "de",
    },
    description: {
      tr: "Sistemin varsayılan dili.",
      en: "Default system language.",
      de: "Standardsprache des Systems.",
    },
    isActive: true,
  },
  {
    key: "booking_confirmation_email_subject",
    value: {
      tr: "🗓️ Randevu Onayı",
      en: "🗓️ Appointment Confirmation",
      de: "🗓️ Terminbestätigung",
    },
    description: {
      tr: "Müşteriye giden randevu onayı e-postasının başlığı.",
      en: "Subject line for customer appointment confirmation email.",
      de: "Betreffzeile der Bestätigungs-E-Mail für den Kunden.",
    },
    isActive: true,
  },
];

const seedSettings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("🔗 MongoDB connected!");

    for (const setting of settings) {
      const exists = await Setting.findOne({ key: setting.key });
      if (!exists) {
        await Setting.create(setting);
        console.log(`✅ Ayar eklendi: ${setting.key}`);
      } else {
        console.log(`ℹ️ Ayar zaten mevcut: ${setting.key}`);
      }
    }

    console.log("🎉 Settings seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Settings seeding failed:", error);
    process.exit(1);
  }
};

seedSettings();

//ts-node src/seeders/settingsSeeder.ts
