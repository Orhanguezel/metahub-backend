import 'module-alias/register';
import express, { Express } from "express";
import http from "http";
import cors from "cors";
import "./core/config/env";
import {connectDB} from "./core/config/connect";
import cookieParser from "cookie-parser";
import { initializeSocket } from "./socket/socket";
import { setLocale } from "./core/middleware/setLocale";
import { getRouter } from "./routes";
import { setupSwagger } from "./core/swagger/setupSwagger";
import { errorHandler } from "./core/middleware/errorMiddleware";




const app: Express = express();
const server = http.createServer(app);

connectDB();

app.use(cookieParser());
app.use(express.json({ strict: false }));
app.use(setLocale);
app.use("/uploads", express.static("uploads"));

// CORS
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Not allowed by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


(async () => {
  const router = await getRouter();
  app.use("/api", router);

  await setupSwagger(app);

  app.use(errorHandler);

  const port = process.env.PORT || 5014;
  server.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
  });

  initializeSocket(server);
})();
