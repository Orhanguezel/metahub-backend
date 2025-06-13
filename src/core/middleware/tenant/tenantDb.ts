import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import logger from "@/core/middleware/logger/logger";

const connections: Record<string, mongoose.Connection> = {};

export const getTenantDbConnection = async (
  tenant: string
): Promise<mongoose.Connection> => {
  if (connections[tenant]) {
    logger.info(`[tenantDb] Using cached DB connection for "${tenant}"`, {
      tenant,
      module: "tenantDb",
      status: "cached",
    });
    return connections[tenant];
  }

  const envPath = path.resolve(process.cwd(), `.env.${tenant}`);
  logger.info(`[tenantDb] Resolved env path: ${envPath}`, {
    tenant,
    module: "tenantDb",
    path: envPath,
    status: "init",
  });

  if (!fs.existsSync(envPath)) {
    logger.error(`[tenantDb] Environment file not found: .env.${tenant}`, {
      tenant,
      module: "tenantDb",
      path: envPath,
      status: "fail",
    });
    throw new Error(`Environment file for tenant "${tenant}" not found`);
  }

  const result = dotenv.config({ path: envPath });
  if (result.error) {
    logger.error(`[tenantDb] Error loading .env.${tenant}`, {
      tenant,
      module: "tenantDb",
      error: result.error,
      status: "fail",
    });
    throw result.error;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error(`[tenantDb] Missing MONGO_URI in .env.${tenant}`, {
      tenant,
      module: "tenantDb",
      status: "fail",
    });
    throw new Error(`MONGO_URI not defined in .env.${tenant}`);
  }

  logger.info(`[tenantDb] Connecting to MongoDB for tenant "${tenant}"...`, {
    tenant,
    module: "tenantDb",
    mongoUri: uri,
    status: "connecting",
  });

  const conn = mongoose.createConnection(uri, {
    bufferCommands: false,
    autoCreate: true,
  });

  await new Promise<void>((resolve, reject) => {
    conn.once("open", () => {
      logger.info(`[tenantDb] ✅ Connected to tenant "${tenant}"`, {
        tenant,
        module: "tenantDb",
        status: "success",
      });
      connections[tenant] = conn;
      resolve();
    });

    conn.on("error", (err) => {
      logger.error(`[tenantDb] ❌ Connection failed for "${tenant}"`, {
        tenant,
        module: "tenantDb",
        error: err,
        status: "fail",
      });
      reject(err);
    });
  });

  return conn;
};
