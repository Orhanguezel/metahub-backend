//src/core/config/modelRegistry.ts
import { getTenantDbConnection } from "@/core/config/tenantDb";
import mongoose from "mongoose";

const modelCache = new Map<string, any>();

export const getTenantModel = async <T>(
  tenant: string,
  modelName: string,
  schema: mongoose.Schema<T>
): Promise<mongoose.Model<T>> => {
  const key = `${tenant}_${modelName}`;
  if (modelCache.has(key)) return modelCache.get(key);

  const conn = await getTenantDbConnection(tenant); // ✅ async
  const model = conn.model<T>(modelName, schema);
  modelCache.set(key, model);

  return model;
};
