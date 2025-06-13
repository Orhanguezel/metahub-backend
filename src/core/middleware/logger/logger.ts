import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

const LOG_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

const env = process.env.NODE_ENV || "development";

const customFormat = winston.format((info) => {
  // Eğer tenant varsa ekle
  if (info.tenant) {
    info.message = `[tenant: ${info.tenant}] ${info.message}`;
  }
  return info;
});

// Günlük rotate edilen dosyalar (JSON)
const dailyRotateFileTransport = new (
  winston.transports as any
).DailyRotateFile({
  filename: path.join(LOG_DIR, "%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: false,
  maxSize: "50m",
  maxFiles: "30d",
  level: env === "production" ? "info" : "debug",
  format: winston.format.json(), // JSON format!
});

const logFormat = winston.format.combine(
  customFormat(), // 🔥 tenant bilgisi burada ekleniyor
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: env === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    dailyRotateFileTransport,
    // Ayrı hata dosyası (opsiyonel)
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: winston.format.json(),
    }),
  ],
});

// Console'a readable output (dev ortamı)
if (env !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }) =>
            `${timestamp} [${level}] ${message}${
              Object.keys(meta).length ? " " + JSON.stringify(meta) : ""
            }`
        )
      ),
    })
  );
}

export default logger;
