// src/core/swagger/setupSwagger.ts
import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpecFromMeta } from "./generateSwaggerSpec";
import path from "path";
import fs from "fs";

/**
 * Sets up Swagger UI using meta-config based specification.
 */
export const setupSwagger = async (app: Express): Promise<void> => {
  try {
    const envProfile = process.env.APP_ENV;
    const port = process.env.PORT;
    const host = process.env.HOST;
    const metaConfigPath = process.env.META_CONFIG_PATH;

    if (!envProfile) {
      throw new Error("❌ APP_ENV is not defined.");
    }

    if (!metaConfigPath) {
      console.warn("⚠️ META_CONFIG_PATH is not defined. Swagger might not be available.");
      return;
    }

    const swaggerDir = path.resolve(process.cwd(), metaConfigPath);

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

    if (host && port) {
      const swaggerUrl = `${host}:${port}/api-docs`;
      console.log(`📘 Swagger UI available at: ${swaggerUrl}`);
    } else {
      console.log(`📘 Swagger UI available at: /api-docs`);
    }
  } catch (err) {
    console.error("❌ Failed to setup Swagger:", err);
  }
};
