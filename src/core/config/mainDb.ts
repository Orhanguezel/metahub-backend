// src/core/config/mainDb.ts
import mongoose from "mongoose";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

export async function connectMainDb() {
  const lang = getLogLocale();
  const uri = process.env.MONGO_URI!;
  if (!uri) {
    logger.error(t("server.mongoUriMissing", lang, translations), {});
    throw new Error("MONGO_URI environment variable is not set!");
  }

  try {
    await mongoose.connect(uri, {
      // useNewUrlParser: true, useUnifiedTopology: true, // opsiyonel modern parametreler
    });
    logger.info(
      t("server.mongoConnected", lang, translations, { uri }),
      {
        uri,
      }
    );
    console.log(`🌍 [GLOBAL] MongoDB connected: ${uri}`);
  } catch (err) {
    logger.error(
      t("server.mongoConnectFail", lang, translations, { error: err?.message }),
      {}
    );
    console.error("❌ MongoDB bağlantı hatası:", err);
    process.exit(1);
  }
}
