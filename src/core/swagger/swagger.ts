import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpecFromMeta } from "./generateSwaggerSpec";
import path from "path";
import dotenv from "dotenv";

// 🌍 Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "ensotek";
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${envProfile}`),
});

export const setupSwagger = (app: Express): void => {
  const swaggerSpec = generateSwaggerSpecFromMeta();
  const swaggerPath = process.env.SWAGGER_ROUTE || "/api-docs";
  const brand = process.env.BRAND_NAME || "Ensotek";
  app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
