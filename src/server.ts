import express, { Express } from "express";
import cors from "cors";
import http from "http";
import "./core/config/env";
import connectDB from "./core/config/connect";
import routes from "./routes";
import cookieParser from "cookie-parser";
import { setLocale } from "./core/middleware/setLocale";
import { initializeSocket } from "./socket/socket";

const app: Express = express();
const server = http.createServer(app);

connectDB();

app.use(cookieParser());

const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

app.use(
  cors({
    origin: function (origin, callback) {
      // SSR veya Postman gibi durumlar için origin null olabilir
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Not allowed by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Cookie gönderimi için GEREKLİ
  })
);

app.use(express.json({ strict: false }));

app.use(setLocale);
app.use("/uploads", express.static("uploads"));
app.use("/api", routes);

initializeSocket(server);

const port = process.env.PORT || 5015;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
