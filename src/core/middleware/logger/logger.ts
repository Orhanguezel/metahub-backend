// src/core/middleware/logger/logger.ts
import tenantLoggerModule from "./tenantLogger";
import type { Logger } from "winston";

// Minimum global context, pratik çözüm:
function getCurrentTenantFromContext(): string {
  return (global as any).__currentTenant || process.env.APP_ENV || "unknown";
}

const handler: ProxyHandler<any> = {
  get(target, prop) {
    if (
      typeof prop === "string" &&
      ["info", "error", "warn", "debug", "verbose", "silly", "http"].includes(
        prop
      )
    ) {
      return (...args: any[]) => {
        const tenant = getCurrentTenantFromContext();
        return tenantLoggerModule.getTenantLogger(tenant)[prop](...args);
      };
    }
    // tenantLoggerModule'daki yardımcı fonksiyonlar
    if (prop in tenantLoggerModule) {
      return (tenantLoggerModule as any)[prop];
    }
    return undefined;
  },
};

const logger = new Proxy({}, handler) as Logger & typeof tenantLoggerModule;
export default logger;
