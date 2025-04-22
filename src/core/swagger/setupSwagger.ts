// src/core/swagger/setupSwagger.ts
import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpecFromMeta } from "./generateSwaggerSpec";
import dotenv from "dotenv";
import path from "path";

const envProfile = process.env.APP_ENV || "metahub";

dotenv.config({
  path: path.resolve(process.cwd(), `.env.${envProfile}`),
});

export const setupSwagger = async (app: Express): Promise<void> => {
    const spec = await generateSwaggerSpecFromMeta(); 

  app.get("/swagger.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(spec);
  });

  // Swagger UI setup
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(undefined, {
    swaggerUrl: "/swagger.json",
  }));

  const port = process.env.PORT || "5014";
  const host = process.env.HOST || "http://localhost";
  const swaggerUrl = `${host}:${port}/api-docs`;
    console.log(`📘 Swagger UI available at: ${swaggerUrl}`);
};


