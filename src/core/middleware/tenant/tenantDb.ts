import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

const connections: Record<string, mongoose.Connection> = {};

export const getTenantDbConnection = async (
  tenant: string
): Promise<mongoose.Connection> => {
  if (connections[tenant]) return connections[tenant];

  const envPath = path.resolve(process.cwd(), `.env.${tenant}`);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file for tenant "${tenant}" not found`);
  }

  const result = dotenv.config({ path: envPath });
  if (result.error) throw result.error;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error(`MONGO_URI not defined in .env.${tenant}`);

  const conn = mongoose.createConnection(uri, {
    bufferCommands: false,
    autoCreate: true,
  });

  // Bağlantı başarıyla kurulmadan önce return etme!
  await new Promise<void>((resolve, reject) => {
    conn.once("open", () => {
      console.log(`✅ [MongoDB] Connected to tenant: "${tenant}"`);
      connections[tenant] = conn;
      resolve();
    });

    conn.on("error", (err) => {
      console.error(
        `❌ [MongoDB] Connection failed for tenant: "${tenant}"`,
        err
      );
      reject(err);
    });
  });

  return conn;
};
