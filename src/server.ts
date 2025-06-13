import "module-alias/register";
import express, { Express } from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";

import "./core/config/env";

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

import { connectDB } from "./core/config/connect";
import { initializeSocket } from "./socket/socket";
import { setLocale } from "./core/utils/i18n/setLocale";
import { getRouter } from "./routes";
import { setupSwagger } from "./core/swagger/setupSwagger";
import { errorHandler } from "./core/middleware/errorMiddleware";
import { injectTenantModel } from "./core/middleware/tenant/injectTenantModel";

const app: Express = express();
const server = http.createServer(app);

const lang = getLogLocale();

connectDB();

// Middleware
app.use(cookieParser());
app.use(express.json({ strict: false }));
app.use(setLocale);
app.use(injectTenantModel);
app.use("/uploads", express.static("uploads"));

// CORS
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(
          t("server.cors.notAllowed", lang, translations, { origin })
        );
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

(async () => {
  const router = await getRouter();
  app.use("", router);

  await setupSwagger(app);

  app.use(errorHandler);

  const port = process.env.PORT;
  if (!port) {
    logger.error(t("server.error.noPort", lang, translations));
    process.exit(1);
  }

  server.listen(Number(port), () => {
    const baseUrl = process.env.BASE_URL || `http://localhost:${Number(port)}`;
    logger.info(t("server.started", lang, translations, { baseUrl }));
  });

  initializeSocket(server);
})();
