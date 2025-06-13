// src/core/middleware/tenant/injectTenantModel.ts

import { Request, Response, NextFunction } from "express";
import { getTenantModel } from "@/core/middleware/tenant/modelRegistry";
import { Schema, Model } from "mongoose";
import { resolveTenantFromRequest } from "./resolveTenant";
declare global {
  namespace Express {
    interface Request {
      getModel: <T = any>(
        modelName: string,
        schema: Schema<T>
      ) => Promise<Model<T>>;
      tenant: string;
    }
  }
}
// src/core/middleware/tenant/injectTenantModel.ts

export const injectTenantModel = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = resolveTenantFromRequest(req);
  req.tenant = tenant;

  req.getModel = async <T = any>(modelName: string, schema: Schema<T>) => {
    return getTenantModel<T>(tenant, modelName, schema);
  };

  if (process.env.NODE_ENV !== "production") {
    console.log(`🔑 Tenant resolved: ${tenant}`);
    console.log("HOSTNAME:", req.hostname);
    console.log("HEADERS.HOST:", req.headers.host);
    console.log("HEADERS.X-Tenant:", req.headers["x-tenant"]);
  }

  next();
};
