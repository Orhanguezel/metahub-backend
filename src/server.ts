import "module-alias/register";
import express, { Express } from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";

import "./core/config/env";

import { connectDB } from "./core/config/connect";
import { initializeSocket } from "./socket/socket";
import { setLocale } from "./core/middleware/setLocale";
import { getRouter } from "./routes";
import { setupSwagger } from "./core/swagger/setupSwagger";
import { errorHandler } from "./core/middleware/errorMiddleware";

const app: Express = express();
const server = http.createServer(app);

connectDB();

// Middleware
app.use(cookieParser());
app.use(express.json({ strict: false }));
app.use(setLocale);
app.use("/uploads", express.static("uploads"));

// CORS
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Not allowed by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

(async () => {
  const router = await getRouter();
  app.use("", router);

  await setupSwagger(app);

  app.use(errorHandler);

  const port = process.env.PORT;
  if (!port) {
    console.error("❌ PORT not defined in environment file.");
    process.exit(1);
  }

  server.listen(Number(port), () => {
  const baseUrl = process.env.BASE_URL;
  console.log(`🚀 Server running at ${baseUrl}`);
});


  initializeSocket(server);
})();
