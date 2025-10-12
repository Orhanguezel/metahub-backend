import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerFromRouters } from "./generateSwaggerFromRouters";

/**
 * Router tarama tabanlı Swagger UI kurulumu.
 * - GET /swagger.json → dinamik spec
 * - GET /api-docs     → Swagger UI
 *
 * ENV:
 *  - SWAGGER_ROUTE       : Swagger UI route (varsayılan: /api-docs)
 *  - SWAGGER_BASE_URL    : servers[0].url (örn: http://localhost:5019)
 *  - SWAGGER_API_PREFIX  : API path prefix (varsayılan: /api)
 */
export const setupSwagger = async (app: Express): Promise<void> => {
  const swaggerRoute = process.env.SWAGGER_ROUTE || "/api-docs";

  const spec = await generateSwaggerFromRouters(false);
  if (!spec) {
    console.warn("⚠️ Swagger spec could not be generated (router scan).");
    return;
  }

  app.get("/swagger.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(spec);
  });

  app.use(
    swaggerRoute,
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerUrl: "/swagger.json" })
  );

  console.log(`📘 Swagger UI available at: ${swaggerRoute}`);
};
