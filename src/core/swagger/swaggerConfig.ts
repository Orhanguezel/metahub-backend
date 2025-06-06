// src/core/swagger/swaggerOptions.ts

import path from "path";

/**
 * Swagger configuration for OpenAPI 3.
 */
const envProfile = process.env.APP_ENV;
const brand = process.env.BRAND_NAME;
const apiVersion = process.env.API_VERSION;
const baseUrl = process.env.SWAGGER_BASE_URL;
const contactEmail = process.env.CONTACT_EMAIL;
const contactUrl = process.env.CONTACT_URL;

if (!envProfile) throw new Error("❌ APP_ENV is not defined.");
if (!brand) throw new Error("❌ BRAND_NAME is not defined.");
if (!apiVersion) throw new Error("❌ API_VERSION is not defined.");
if (!baseUrl) throw new Error("❌ SWAGGER_BASE_URL is not defined.");
if (!contactEmail) throw new Error("❌ CONTACT_EMAIL is not defined.");
if (!contactUrl) throw new Error("❌ CONTACT_URL is not defined.");

export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${brand} Backend API`,
      version: apiVersion,
      description: `📘 API documentation for the ${brand} backend project.`,
      contact: {
        name: `${brand} Support`,
        email: contactEmail,
        url: contactUrl,
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: baseUrl,
        description: `Base URL for ${envProfile} environment`,
      },
    ],
  },
  apis: ["src/modules/**/*.routes.ts"],
};
