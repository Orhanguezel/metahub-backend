// src/core/swagger/setupSwagger.ts
import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpecFromMeta } from "./generateSwaggerSpec";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// 🌍 .env.{envProfile} dosyasını dinamik yükle
const envProfile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment: ${envPath}`);
} else {
  console.warn(`⚠️ Environment file "${envPath}" not found. Using defaults.`);
}

process.env.ACTIVE_META_PROFILE = envProfile;

// 🚀 Swagger setup
export const setupSwagger = async (app: Express): Promise<void> => {
  try {
    // ✅ Meta-configs klasörü kontrolü
    const swaggerDir = path.resolve(
      process.cwd(),
      `dist/meta-configs/${envProfile}`
    );

    if (!fs.existsSync(swaggerDir)) {
      console.warn(`⚠️ Swagger config folder not found: ${swaggerDir}`);
      return;
    }

    const spec = await generateSwaggerSpecFromMeta();

    if (!spec) {
      console.warn("⚠️ Swagger spec generation failed or returned undefined.");
      return;
    }

    app.get("/swagger.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(spec);
    });

    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(undefined, {
        swaggerUrl: "/swagger.json",
      })
    );

    const port = process.env.PORT || "5014";
    const host = process.env.HOST || "http://localhost";
    const swaggerUrl = `${host}:${port}/api-docs`;

    console.log(`📘 Swagger UI available at: ${swaggerUrl}`);
  } catch (err) {
    console.error("❌ Failed to setup Swagger:", err);
  }
};
