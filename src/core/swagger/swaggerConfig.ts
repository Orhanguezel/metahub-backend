import path from "path";
import dotenv from "dotenv";

// Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "ensotek";
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${envProfile}`),
});

const BRAND_NAME = process.env.BRAND_NAME || "Ensotek";
const API_VERSION = process.env.API_VERSION || "1.0.0";
const BASE_URL = process.env.SWAGGER_BASE_URL || "http://localhost:5014/api";

export const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${BRAND_NAME} Backend API`,
      version: API_VERSION,
      description: `📘 API documentation for the ${BRAND_NAME} backend project.`,
      contact: {
        name: `${BRAND_NAME} Support`,
        email: process.env.CONTACT_EMAIL || "support@example.com",
        url: process.env.CONTACT_URL || "https://example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: BASE_URL,
        description: `Base URL for ${envProfile} environment`,
      },
    ],
  },
  apis: ["src/modules/**/*.routes.ts"],
};
