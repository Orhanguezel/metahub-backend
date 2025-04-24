
---

# 📘 Swagger UI Kurulumu ve Kullanımı (`SWAGGER_SETUP.md`)

Bu belge, MetaHub projesinde **Swagger UI** entegrasyonunu, yapılandırmasını ve kullanım detaylarını açıklar.

---

## 🎯 Amaç

Swagger UI, API endpoint'lerinin otomatik belgelenmesini ve görsel olarak test edilmesini sağlar. MetaHub'da tüm aktif modüller için Swagger belgeleri **meta dosyaları üzerinden** dinamik olarak üretilir.

---

## 📦 Ana Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `generateSwaggerSpec.ts` | Meta dosyalarından Swagger `paths`, `tags` ve `components` nesnelerini üretir |
| `setupSwagger.ts` | Express uygulamasına Swagger arayüzünü bağlar (`/swagger.json` ve `/api-docs`) |
| `swaggerConfig.ts` | Swagger ayarlarını merkezi olarak tutar (gerekirse genişletilebilir) |
| `getEnabledModules.ts` | Ortama göre aktif modülleri tespit eder |

---

## ⚙️ Kullanım Akışı

1. `meta-configs/metahub/*.meta.json` dosyaları taranır
2. Sadece `.env.<env>` dosyasında aktif olan modüller dahil edilir
3. Her route için:
   - `method`, `path`, `auth`, `summary` bilgileri alınır
   - Opsiyonel olarak `body` şeması da eklenebilir (JSON Schema formatında)
4. `/swagger.json` olarak erişilir
5. `/api-docs` üzerinden görsel arayüz sağlanır

---

## ✅ Entegrasyon

### 1. Express Sunucusunda Kullanımı

```ts
import express from "express";
import { setupSwagger } from "@/core/swagger/setupSwagger";

const app = express();
await setupSwagger(app);
```

### 2. Gözle Görülür Arayüzler

| URL | Açıklama |
|-----|----------|
| `/swagger.json` | Ham Swagger JSON |
| `/api-docs`     | Swagger UI arayüzü |

---

## 🌍 Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `APP_ENV` | Yüklenecek `.env.*` dosyasını belirler (örn: `metahub`, `kuhlturm`) |
| `PORT`    | Swagger URL’sinde kullanılır |
| `HOST`    | Swagger URL’sinde kullanılır |
| `SWAGGER_BASE_URL` | Swagger sunucusu adresi (varsayılan: `http://localhost:5014/api`) |

---

## 🧠 Gelişmiş Özellikler

- `generateSwaggerSpecFromMeta()` fonksiyonu Swagger verisini runtime'da üretir
- `auth` alanı true ise `security: bearerAuth` eklenir
- `body` alanı varsa Swagger `requestBody` olarak tanımlanır
- `pathPrefix` kullanımı ile route'lar modül içinde gruplandırılabilir

---

## 🚧 Eksikler / Geliştirmeler

- [ ] `form-data` destekleyen endpoint'ler için özel açıklama
- [ ] `responses` şemalarının detaylandırılması
- [ ] `definitions` altında tüm şemaların toplanması
- [ ] Admin panelde Swagger linklerinin gösterimi

---