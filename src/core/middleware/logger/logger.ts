// src/core/middleware/logger/logger.ts
import { getTenantLogger, safeTenantName, getTenantLogDir } from "./tenantLogger";
import type { Logger } from "winston";
import type { Request } from "express";

// Ana logger fonksiyonları
const logger = {
  info: (msg: any, meta?: any, tenant: string = "unknown") =>
    getTenantLogger(tenant).info(msg, meta),
  error: (msg: any, meta?: any, tenant: string = "unknown") =>
    getTenantLogger(tenant).error(msg, meta),
  warn: (msg: any, meta?: any, tenant: string = "unknown") =>
    getTenantLogger(tenant).warn(msg, meta),
  debug: (msg: any, meta?: any, tenant: string = "unknown") =>
    getTenantLogger(tenant).debug(msg, meta),
  getTenantLogger,
  safeTenantName,
  getTenantLogDir,
  withReq: {
    info: (req: Request, msg: any, meta?: any) =>
      getTenantLogger((req as any).tenant || "unknown").info(msg, meta),
    error: (req: Request, msg: any, meta?: any) =>
      getTenantLogger((req as any).tenant || "unknown").error(msg, meta),
    warn: (req: Request, msg: any, meta?: any) =>
      getTenantLogger((req as any).tenant || "unknown").warn(msg, meta),
    debug: (req: Request, msg: any, meta?: any) =>
      getTenantLogger((req as any).tenant || "unknown").debug(msg, meta),
  },
};

export default logger;

export interface TenantLogger {
  info(msg: any, meta?: any, tenant?: string): Logger;
  error(msg: any, meta?: any, tenant?: string): Logger;
  warn(msg: any, meta?: any, tenant?: string): Logger;
  debug(msg: any, meta?: any, tenant?: string): Logger;
  getTenantLogger: typeof getTenantLogger;
  safeTenantName: typeof safeTenantName;
  getTenantLogDir: typeof getTenantLogDir;
  withReq: {
    info(req: Request, msg: any, meta?: any): Logger;
    error(req: Request, msg: any, meta?: any): Logger;
    warn(req: Request, msg: any, meta?: any): Logger;
    debug(req: Request, msg: any, meta?: any): Logger;
  };
}

