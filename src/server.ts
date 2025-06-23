import "module-alias/register";
import express, { Express } from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./core/config/envLoader";
import { connectMainDb } from "@/core/config/mainDb"; // yeni bağlantı fonksiyonunu import et

import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

import { initializeSocket } from "./socket/socket";
import { setLocale } from "./core/utils/i18n/setLocale";
import { getRouter } from "./routes";
import { setupSwagger } from "./core/swagger/setupSwagger";
import { errorHandler } from "./core/middleware/errorMiddleware";
import { asyncMiddleware } from "@/core/utils/asyncMiddleware";
import { resolveTenant } from "@/core/middleware/tenant/resolveTenant";
import { injectTenantModel } from "@/core/middleware/tenant/injectTenantModel";

const app: Express = express();
const server = http.createServer(app);

const lang = getLogLocale();

// IIFE (Immediately Invoked Function Expression) ile başlat
(async () => {
  try {
    await connectMainDb();

    // --- Global middleware (tenant ile ilgisi yok) ---
    app.use(cookieParser());
    app.use(express.json({ strict: false }));
    app.use(setLocale);

    // --- EN KRİTİK: Her istek için tenant injection ---
    app.use(asyncMiddleware(resolveTenant));
    app.use(asyncMiddleware(injectTenantModel));

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

    // Router ve diğer sistemler
    const router = await getRouter();
    app.use("/api", router);

    await setupSwagger(app);

    app.use(errorHandler);

    // --- Yalnızca her şey hazırsa başlat ---
    const port = process.env.PORT || 5019;
    server.listen(Number(port), () => {
      const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
      logger.info(t("server.started", lang, translations, { baseUrl }));
      console.log(
        `🚀 Sunucu başlatıldı: ${baseUrl} (Tüm router ve modüller hazır)`
      );
    });

    initializeSocket(server);
    logger.info(t("server.socketInitialized", lang, translations));
    console.log("🔌 Socket.IO başlatıldı");
    logger.info(t("server.errorHandlerSetup", lang, translations));
  } catch (err: any) {
    logger.error(
      t("server.startupError", lang, translations, { error: err.message })
    );
    console.error("❌ Sunucu başlatılamadı:", err);
    process.exit(1);
  }
})();
