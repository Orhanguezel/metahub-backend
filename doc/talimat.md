
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

APP_ENV=anastasia npm run dev

rm -rf dist node_modules
npm install
npx tsc --noEmit


# 1. Derleyiciyi sıfırla
rm -rf dist
npx tsc --noEmit
npm run build

export TENANT=metahub
bun run dev


# 2. ts-node ile tekrar başlat
APP_ENV=anastasia npm run dev

Her zaman log ve i18n işlemleri için standart bir dil (ör: process.env.LOG_LOCALE) kullanacak şekilde kodu güncelle



# 1. Derleyiciyi sıfırla
rm -rf dist
npx tsc --noEmit
npm run build

pm2 restart all



# 2. ts-node ile tekrar başlat
APP_ENV=metahub bun run dev


---
APP_ENV=radanor npm run dev

# 🌐 MetaHub — Çok Dilli Modül + Log & Veri Analiz Standartları (2025)

## 1. **Çok Dilli Yapı (i18n) — Modül Standartları**

### 1.1 **Desteklenen Dillerin Yönetimi**

* Tüm projede diller **tek noktadan** yönetilir:

  ```ts
  // /src/types/common.ts
  export type SupportedLocale = "tr" | "en" | "de" | "pl" | "fr" | "es";
  export const SUPPORTED_LOCALES: SupportedLocale[] = [ "tr", "en", "de", "pl", "fr", "es" ];
  ```

### 1.2 **Modül Bazlı Çeviriler**

* Her modül için `/modules/[modül]/i18n/` altında `tr.json`, `en.json`, ... dosyaları tutulur.
* `/modules/[modül]/i18n/index.ts`:

  ```ts
  import tr from "./tr.json";
  import en from "./en.json";
  import de from "./de.json";
  import pl from "./pl.json";
  import fr from "./fr.json";
  import es from "./es.json";
  import type { SupportedLocale } from "@/types/common";
  const translations: Record<SupportedLocale, any> = { tr, en, de, pl, fr, es };
  export default translations;
  ```
* Yeni bir dil eklerken yalnızca `SUPPORTED_LOCALES`’a eklemen ve i18n dosyalarını oluşturman yeterli.

### 1.3 **Tip ve Model Standartları**

* Çok dilli alanlar için:

  ```ts
  export type TranslatedLabel = { [key in SupportedLocale]: string };
  ```
* Tüm modül tipleri `/modules/[modül]/types/index.ts`’de ortak tipleri referans alır:

  ```ts
  import type { SupportedLocale, TranslatedLabel } from "@/types/common";
  export interface IBlog { title: TranslatedLabel; ... }
  ```
* Mongoose model:

  ```ts
  import { SUPPORTED_LOCALES } from "@/types/common";
  label: {
    type: Map,
    of: String,
    required: true,
    validate: {
      validator: (obj) => SUPPORTED_LOCALES.every((l) => obj.has(l)),
      message: "All supported locales must be provided in label.",
    }
  }
  ```
* **Hardcoded dil** (ör. sadece `tr`, `en` vs.) **yasaktır**!

### 1.4 **Validasyon Standartları**

* Express validator veya Zod, `SUPPORTED_LOCALES` üzerinden otomatik kontrol:

  ```ts
  body("language").optional().isIn(SUPPORTED_LOCALES)
    .withMessage(`Language must be one of: ${SUPPORTED_LOCALES.join(", ")}.`);
  body("title")
    .custom((value) => {
      try {
        const obj = typeof value === "string" ? JSON.parse(value) : value;
        return SUPPORTED_LOCALES.every((lang) => obj[lang] && obj[lang].trim());
      } catch {
        throw new Error("Title must be a valid object for all locales.");
      }
    });
  ```

### 1.5 **i18n Key Kullanımı**

* Tüm hata, info ve response mesajları **i18n key** üzerinden ve modül i18n dosyasından gelir.
* Backend ve frontend tarafında **ortak çeviri dosyası kullanılır**.

### 1.6 **Yeni Dil Ekleme Akışı**

1. `SUPPORTED_LOCALES`’a yeni dili ekle.
2. Tüm ilgili i18n dizinlerine yeni dil JSON dosyasını ekle.
3. Model, tip, validasyon, controller değiştirmene gerek yok.

---

## 2. **Logger ve Veri Analiz (Log Analytics) Standartları**

### 2.1 **JSON Formatında Loglama + Coğrafi & Kullanıcı Bilgisi**

* **Logger yapılandırması (`logger.ts`):**

  * Loglar **JSON formatında** tutulur.
  * Her gün yeni dosya (rotate), maksimum 30 gün saklanır.
  * Console’a ise renkli/okunaklı çıktı.
  * Her loga otomatik timestamp eklenir.

* **Request context (`logRequestContext.ts`):**

  * Her logda:

    * IP (X-Forwarded-For desteği ile)
    * Ülke, şehir, koordinat (geoip-lite)
    * User Agent
    * userId (login ise)

* **Controller/service’te kullanım örneği:**

  ```ts
  import logger from "@/core/middleware/logger/logger";
  import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

  logger.info("Ürün sepete eklendi.", getRequestContext(req));
  ```

### 2.2 **Log Dosyaları ve Analiz Entegrasyonu**

* Tüm loglar `/logs/YYYY-MM-DD.log` gibi günlük olarak tutulur.
* Tüm loglar **JSON olduğu için**: Kibana, Graylog, Datadog, Papertrail gibi araçlarda rahatça analiz edilir.
* Her log kaydında örnek alanlar:

  ```json
  {
    "timestamp": "2025-06-09 04:00:17",
    "level": "info",
    "message": "Sepet başarıyla getirildi.",
    "ip": "78.174.44.XX",
    "country": "TR",
    "city": "Istanbul",
    "location": {"lat":41.01,"lon":28.97},
    "userAgent": "Mozilla/5.0 ...",
    "userId": "665e0cd...."
  }
  ```
* Gerektiğinde `"event": "cart.add"`, `"module": "cart"`, `"status": "success"` gibi alanlar ekle!

### 2.3 **Geleceğe Hazırlık: Data Mining & Monitoring**

* Loglar Elasticsearch ile ingest edilip **Kibana ile anlık analiz** edilebilir.
* Dilersen event bazlı custom alanları da loglara ekleyebilirsin: `logger.info("Login success", {...context, event: "login"})`
* Her aksiyon tipini (ör: "cart.add", "cart.clear", "user.login") tag’le; future-proof!

---

## 3. **Toplam Akış — Best Practices**

* **Modül, model, validasyon, logger, analiz:**
  Tüm yeni geliştirme ve refaktörlerde bu dokümandaki standartlar birebir uygulanmalı.
* **Hiçbir modülde dil ve log formatı hardcoded/elle tanımlanmaz**.
* **Yeni bir modül/dil eklerken tek noktadan ekle, migration’a gerek yok.**
* **Log analizine uygun, context-rich, JSON loglar** ile data science ve AI tarafında analiz altyapısı hazır olur.

---

## 4. **Ekstra: Otomasyon ve Monitoring Altyapısı**

* Gelişmiş monitoring için örnek bir Docker Compose ile Elasticsearch + Kibana stack hazırlanabilir.
* Otomatik log ingest, alert ve görselleştirme kolayca eklenir.
* Her log satırı bir aksiyon veya hata için veri madenciliği, anomaly detection gibi AI uygulamalarına hazır formatta olur.

---

> **MetaHub’ı ölçeklenebilir, sürdürülebilir ve veri analizine hazır tutmak için bu standartları uygulaman yeterli!**
>
> Bir sonraki adım: Otomasyon scriptleri ve monitoring/analiz örnekleri istersen söyle, direkt starter template hazırlayabilirim.

---

Hazır!
Bundan sonra ister frontend, ister backend, ister log—hepsi tam entegre ve future-proof!