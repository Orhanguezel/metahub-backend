// src/core/swagger/setupSwagger.ts

import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpecFromMeta } from "./generateSwaggerSpec";

/**
 * Initializes Swagger UI with generated specification.
 */
export const setupSwagger = (app: Express): void => {
  const swaggerRoute = process.env.SWAGGER_ROUTE;
  const brand = process.env.BRAND_NAME;

  if (!swaggerRoute) {
    throw new Error("❌ SWAGGER_ROUTE is not defined in environment.");
  }

  if (!brand) {
    throw new Error("❌ BRAND_NAME is not defined in environment.");
  }

  const swaggerSpec = generateSwaggerSpecFromMeta();

  app.use(swaggerRoute, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
