import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Kök log klasörü environment variable veya fallback ile
const BASE_LOG_DIR =
  process.env.LOG_BASE_DIR && process.env.LOG_BASE_DIR.trim()
    ? process.env.LOG_BASE_DIR
    : path.join(process.cwd(), "logs");


const tenantLoggers: Record<string, winston.Logger> = {};

export function safeTenantName(tenant: string) {
  return tenant.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getTenantLogDir(tenant: string) {
  const safe = safeTenantName(tenant || "unknown");
  const dir = path.join(BASE_LOG_DIR, safe);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    // Sadece debug için:
    // console.log(`[Logger] Klasör oluşturuldu: ${dir}`);
  }
  return dir;
}

export function getTenantLogger(tenant: string = "unknown"): winston.Logger {
  if (tenantLoggers[tenant]) return tenantLoggers[tenant];

  const logDir = getTenantLogDir(tenant);

  const dailyRotateFileTransport = new (winston.transports as any).DailyRotateFile({
    filename: path.join(logDir, "%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: false,
    maxSize: "50m",
    maxFiles: "30d",
    level: "debug",
    format: winston.format.json(),
  });

  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const logger = winston.createLogger({
    level: "debug",
    format: logFormat,
    defaultMeta: { tenant },
    transports: [
      dailyRotateFileTransport,
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: "error",
        format: winston.format.json(),
      }),
    ],
  });

  tenantLoggers[tenant] = logger;
  return logger;
}
