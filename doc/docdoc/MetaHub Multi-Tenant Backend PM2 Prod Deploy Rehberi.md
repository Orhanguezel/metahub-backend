
---

# 🚀 MetaHub Multi-Tenant Backend PM2 Prod Deploy Rehberi

## 📁 1. Dosya Yapısı

```bash
/var/www/metahub-backend
├── dist/                # Derlenmiş dosyalar (ts -> js)
├── .env.metahub
├── .env.anastasia
├── .env.[diğer-tenantlar]
├── ecosystem.config.js
└── src/                 # Kaynak TypeScript kodları
```

---

## ⚙️ 2. `.env.[tenant]` Dosyaları

### Örnek: `.env.anastasia`

```env
NODE_ENV=production
APP_ENV=anastasia
PORT=5019
MONGO_URI=mongodb+srv://...
CORS_ORIGIN=https://www.koenigsmassage.com,https://api.guezelwebdesign.com
FRONTEND_URL=https://www.koenigsmassage.com
BASE_URL=https://api.guezelwebdesign.com
```

### `.env.metahub` benzeri ama APP\_ENV ve domain'ler farklı olur.

---

## 🏗️ 3. Build İşlemi

```bash
cd /var/www/metahub-backend
npm install
npm run build
```

> `dist/` dizini oluşur: `dist/server.js` gibi

---

## 🔁 4. `ecosystem.config.js` (PM2)

```js
module.exports = {
  apps: [
    {
      name: "backend-anastasia",
      script: "./dist/server.js",
      env: {
        NODE_ENV: "production",
        APP_ENV: "anastasia",
      },
    },
    {
      name: "backend-metahub",
      script: "./dist/server.js",
      env: {
        NODE_ENV: "production",
        APP_ENV: "metahub",
      },
    },
    // Diğer tenant'lar...
  ],
};
```

---

## 🚀 5. PM2 ile Başlat

```bash
cd /var/www/metahub-backend
pm2 start ecosystem.config.js
pm2 save
```

> Tenant başına bir process çalışır. Örnek:

```bash
pm2 status
```

Çıktı:

```
backend-anastasia │ dist/server.js │ online │
backend-metahub   │ dist/server.js │ online │
```

---

## 🛠️ 6. Log ve Restart İşlemleri

```bash
pm2 logs backend-anastasia
pm2 restart backend-metahub
```

---

## 🌍 7. Tenant Ayrımı (Middleware ile)

**Middleware:** `injectTenantModel.ts` + `resolveTenantFromHost.ts`

Örnek:

```ts
if (host.includes("koenigsmassage.com")) return "anastasia";
if (host.includes("guezelwebdesign.com")) return "metahub";
```

Tenant’a göre `.env` dosyası ve DB bağlantısı **dinamik** olarak yüklenir:

```ts
const envPath = path.resolve(process.cwd(), `.env.${tenant}`);
dotenv.config({ path: envPath });
```

---

## ✅ 8. Nginx Reverse Proxy (Port: 5019 → api.domain.com)

```nginx
server {
  listen 80;
  server_name api.guezelwebdesign.com;

  location / {
    proxy_pass http://localhost:5019;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## 🧼 9. Geliştirici Notları

* Her tenant için:

  * `.env.[tenant]` hazır olmalı
  * PM2 `env.APP_ENV` ona göre set edilmeli
* `getTenantDbConnection` her tenant için ayrı bağlantı kurar (singleton).
* `injectTenantModel` middleware'i sayesinde her request doğru tenant ile çalışır.
* `getTenantModels(req)` ile her controller içinden modeller çekilir.

---
