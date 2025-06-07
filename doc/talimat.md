
---

# ✅ MetaHub Ortam Yönetim Talimatı (`.env` & APP\_ENV Standardı)

## 🎯 Amaç

MetaHub backend projelerinde ortam bağımlı ayarlar (`PORT`, `MONGO_URI`, `SITE_TEMPLATE` vs.) hiçbir zaman kod içine sabit olarak yazılmaz (**hardcoded yasaktır**). Tüm yapı, `.env.[profil]` dosyalarına göre dinamik olarak çalışır.

---

## 📁 1. `.env` Dosya Yapısı

Tüm ortamlar için `.env.[profil]` formatı kullanılır:

```bash
.env.metahub
.env.ensotek
.env.radanor
.env.dev
.env.prod
```

> Gerekirse `.env.defaults` ile fallback key'ler tanımlanabilir, ancak bu zorunlu değildir.

---

## ⚙️ 2. Aktif Ortamın Belirlenmesi

Aktif ortam her zaman şu şekilde dışarıdan belirlenir:

```bash
APP_ENV=metahub bun run dev
# veya
APP_ENV=metahub pm2 start ...
```

Kod içinde asla `metahub`, `prod` gibi string’ler **elle yazılmaz**.

---

## 📄 3. Ortam Yükleme – `src/core/config/env.ts`

Yalnızca bu dosya ortam değişkenlerini yükler:

```ts
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envProfile = process.env.APP_ENV || "default";
const envFile = `.env.${envProfile}`;
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment from ${envFile}`);
} else {
  console.warn(`⚠️ ${envFile} not found. Trying fallback .env...`);
  const fallbackPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(fallbackPath)) {
    dotenv.config({ path: fallbackPath });
    console.log("✅ Loaded fallback .env");
  } else {
    console.warn("⚠️ No .env file found. Environment variables may be undefined.");
  }
}

process.env.ACTIVE_META_PROFILE = envProfile;
console.log(`🌐 Active profile: ${envProfile}`);
```

> Bu dosya sadece `src/server.ts` içinde **bir kez** import edilir.

---

## 🔌 4. Veritabanı Bağlantısı – `src/core/config/connect.ts`

```ts
import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI not defined.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected.");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
};

export { connectDB };
```

---

## 🚀 5. Sunucu Başlatma – `src/server.ts`

```ts
import "module-alias/register";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";

// Ortamı yükle (bir kez!)
import "./core/config/env";
import { connectDB } from "./core/config/connect";
import { initializeSocket } from "./socket/socket";
import { setLocale } from "./core/middleware/setLocale";
import { getRouter } from "./routes";
import { setupSwagger } from "./core/swagger/setupSwagger";
import { errorHandler } from "./core/middleware/errorMiddleware";

const app = express();
const server = http.createServer(app);

connectDB();

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
    console.error("❌ PORT not defined in .env file");
    process.exit(1);
  }

  server.listen(Number(port), () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });

  initializeSocket(server);
})();
```

---

## 📋 6. Örnek `.env.metahub`

```env
APP_ENV=metahub
PORT=5010
MONGO_URI=mongodb+srv://metahub-db-uri
CORS_ORIGIN=http://localhost:3000,http://metahub.local
SITE_TEMPLATE=modern
```

---

## 🧪 7. Test & Çalıştırma

```bash
APP_ENV=metahub bun run dev
APP_ENV=ensotek bun run dev
```

> **`.env` dosyasını değiştirmek gerekmez**, sadece `APP_ENV` belirterek farklı profil çalıştırılır.

---

## 🔒 8. Hardcoded Yasakları

🚫 **Aşağıdakiler kesinlikle yasaktır:**

* `PORT = 5014` gibi sabit değerler
* `metahub`, `ensotek` gibi string profil adları
* Kod içinde `.env` dosya adını doğrudan yazmak

---

## ✅ Avantajlar

* Multi-tenant destekli yapı
* PM2/Cluster uyumlu
* Tamamen çevresel yapılandırma (12-Factor App uyumlu)
* Tema, veritabanı, port gibi her şey dışa bağımlı

---

bu dosyada da .env kullanımını MetaHub standartlarına göre merkezi hale getirelim.


APP_ENV=radanor bun run dev

APP_ENV=metahub bun run dev

APP_ENV=anastasia bun run dev

APP_ENV=ensotek bun run dev

