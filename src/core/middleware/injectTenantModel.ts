// src/core/middleware/injectTenantModel.ts

import { Request, Response, NextFunction } from "express";
import { getTenantModel } from "@/core/config/modelRegistry";
import { resolveTenantFromHost } from "@/core/middleware/resolveTenant";
import { Schema, Model } from "mongoose";

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

export const injectTenantModel = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const tenant = resolveTenantFromHost(req.hostname);
  req.tenant = tenant;

  req.getModel = async <T = any>(modelName: string, schema: Schema<T>) => {
    return getTenantModel<T>(tenant, modelName, schema);
  };

  if (process.env.NODE_ENV !== "production") {
    console.log(`🔑 Tenant resolved: ${tenant}`);
    console.log("HOSTNAME:", req.hostname);
    console.log("HEADERS.HOST:", req.headers.host);
  }

  next();
};
