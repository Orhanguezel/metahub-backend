
---

# 🚀 Deployment Rehberi (`DEPLOYMENT.md`)

Bu doküman, MetaHub projesinin **production** ortamına nasıl deploy edildiğini, yapılandırma adımlarını ve önemli notları açıklar.

---

## 🧱 Proje Yapısı

- Proje çoklu frontend tarafından kullanılabilecek şekilde **modüler backend mimarisi** ile geliştirilmiştir.
- Ortam profilleri `.env.metahub`, `.env.kuhlturm` vb. dosyalarla ayrıştırılır.
- Her frontend projesi için backend tarafından sadece ilgili modüller etkinleştirilir (`ENABLED_MODULES` listesi ile).

---

## 📁 Dosya Yapısı

```
metahub-backend/
├── .env.metahub
├── .env.kuhlturm
├── meta-configs/
│   └── metahub/
├── src/
│   ├── modules/
│   ├── core/
│   ├── scripts/
│   └── server.ts
└── public/
```

---

## ⚙️ Ortam Değişkenleri (Environment Setup)

`.env.<profile>` dosyaları aşağıdaki gibi yapılandırılmalıdır:

```env
PORT=5014
HOST=http://localhost
APP_ENV=metahub

MONGO_URI=mongodb+srv://...
JWT_SECRET=...
SWAGGER_BASE_URL=http://localhost:5014/api

ENABLED_MODULES=blog,product,order,user,...
META_CONFIG_PATH=src/meta-configs/metahub
```

> Her ortam için ayrı `.env` dosyası hazırlanmalı ve `APP_ENV` değişkeni doğru ayarlanmalıdır.

---

## 🔨 Build & Start Komutları

### Geliştirme Ortamı:

```bash
bun run dev
```

> `src/tools/generateMeta.ts` ile başlar, ardından `server.ts` başlatılır.

### Production Ortamı (örnek PM2 ile):

```bash
bun build
pm2 start "bun run dist/server.js"
```

### Otomatik Deploy (Webhook + Git Pull + Restart)

1. GitHub Webhook ile repo'ya push yapıldığında tetiklenir
2. `deploy.sh` çalışır:
   - `git pull`
   - `bun install`
   - `bun run generate:meta`
   - `pm2 restart backend`

---

## 🚀 Webhook Örneği (`deploy.sh`)

```bash
#!/bin/bash
cd /var/www/metahub-backend
git pull origin main
bun install
bun run src/tools/generateMeta.ts
pm2 restart metahub
```

> Web sunucuda `chmod +x deploy.sh` ve `pm2 start` komutu uygulanmalı.

---

## 🧪 Son Kontroller

- [ ] `.env.*` dosyasında gerekli modüller `ENABLED_MODULES` altında tanımlı mı?
- [ ] `meta` dosyaları eksiksiz mi?
- [ ] MongoDB bağlantısı çalışıyor mu?
- [ ] Swagger `/api-docs` çalışıyor mu?
- [ ] Token ve güvenlik ayarları tamam mı?

---

## 🧩 Gelişime Açık Alanlar

- [ ] CI/CD pipeline (GitHub Actions, GitLab CI vs.)
- [ ] Otomatik versiyonlama
- [ ] Ortam bazlı loglama ve monitoring
- [ ] Merkezi config yönetimi (örn: `config/` klasörü üzerinden)

---
