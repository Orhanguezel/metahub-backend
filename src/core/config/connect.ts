import mongoose from "mongoose";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import os from "os";

const profile = process.env.ACTIVE_META_PROFILE || process.env.APP_ENV || "en";
const lang: SupportedLocale =
  (process.env.LOG_LOCALE as SupportedLocale) || "en";

const getConnectionContext = () => ({
  profile,
  lang,
  node_env: process.env.NODE_ENV,
  pid: process.pid,
  host: os.hostname(),
  platform: os.platform(),
  ip: (() => {
    // Sunucu ip'sini belirlemek için
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]!) {
        // IPv4, public IP
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
    return "unknown";
  })(),
  time: new Date().toISOString(),
  mongo_uri: process.env.MONGO_URI?.split("@")[1]?.split("/")[0] || "hidden", // only host:port
});

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error(t("mongo.error.notDefined", lang, translations), getConnectionContext());
    return;
  }
  try {
    await mongoose.connect(uri);
    logger.info(
      t("mongo.connected", lang, translations),
      getConnectionContext()
    );
  } catch (error) {
    logger.error(
      t("mongo.connectionError", lang, translations, { error: String(error) }),
      { ...getConnectionContext(), error: String(error) }
    );
  }
};

export { connectDB };
