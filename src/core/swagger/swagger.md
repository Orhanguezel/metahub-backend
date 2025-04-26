
---

# 📘 Swagger API Dokümantasyonu - MetaHub Backend

## 📚 Hakkında
Bu klasör, **MetaHub Backend API**'sinin otomatik Swagger/OpenAPI dokümantasyonunu oluşturur ve sunar.

✅ Otomatik Meta verilerinden Swagger Spec üretimi  
✅ Sadece aktif (`ENABLED_MODULES`) modüllerin dahil edilmesi  
✅ Express uygulamasına Swagger UI entegresi  
✅ JWT (Bearer) auth destekli API dökümantasyonu

---

## 📦 Dosya Yapısı

```bash
src/
└── core/
    └── swagger/
        ├── generateSwaggerSpec.ts    # Meta dosyalarından Swagger Spec üretir
        ├── getEnabledModules.ts      # Aktif modülleri .env'den okur
        ├── setupSwagger.ts           # Express uygulamasına Swagger UI entegre eder
        ├── swagger.ts                # Swagger ana export dosyası
        └── swaggerConfig.ts          # Swagger konfigürasyon ayarları
```

---

## ⚙️ Nasıl Çalışır?

1. `generateSwaggerSpec.ts`:
   - `meta-configs/` altındaki tüm `.meta.json` dosyalarını okur.
   - İçindeki `routes` ve `validation` bilgilerini kullanarak OpenAPI Spec oluşturur.

2. `getEnabledModules.ts`:
   - `.env` dosyasındaki `ENABLED_MODULES` değerine göre sadece aktif modülleri belirler.

3. `setupSwagger.ts`:
   - Üretilen Swagger Spec dosyasını `/swagger.json` endpointi üzerinden sunar.
   - Swagger UI'ı `/api-docs` altında hazır hale getirir.

4. `swaggerConfig.ts`:
   - Swagger metadata (`title`, `description`, `version`, vs.) içerir.

5. `swagger.ts`:
   - `setupSwagger` fonksiyonunu ana export eder.

---

## 🛠 Kullanım

**1. Meta Generate Et:**

Swagger'ın doğru çalışması için önce Meta dosyaları üretilmeli:

```bash
bun run generate:meta
```

**2. Server Başlat:**

```bash
bun run dev
```

**3. Swagger UI'a Git:**

Tarayıcıda aç:

```bash
http://localhost:5014/api-docs
```

**4. Swagger JSON Endpoint:**

```bash
http://localhost:5014/swagger.json
```

---

## 📄 Örnek Swagger Spec Yapısı

Üretilen JSON Spec şu yapıya benzer:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "MetaHub API",
    "version": "1.0.0",
    "description": "API documentation for MetaHub Backend project."
  },
  "servers": [
    {
      "url": "http://localhost:5014/api"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [
    { "bearerAuth": [] }
  ],
  "paths": {
    "/user/login": {
      "post": {
        "summary": "User login",
        "tags": ["Auth"],
        "requestBody": { /* Validation schema */ },
        "responses": { "200": { "description": "Success" } }
      }
    }
  }
}
```

---

## 🔥 Özellikler

| Özellik                                | Durum |
|:---------------------------------------|:-----:|
| Meta'dan otomatik route tanıma          | ✅ |
| Validation Body şemaları desteği        | ✅ |
| Sadece aktif modüllerle Swagger üretimi | ✅ |
| JWT Bearer Token security şeması        | ✅ |
| Swagger UI ve JSON endpoint             | ✅ |
| Çoklu ortam (.env.*) profilleri         | ✅ |

---

## 🧹 Önemli Notlar

- **ENABLED_MODULES** `.env.metahub`, `.env.admin` gibi ortamlarda tanımlı olmalıdır.
- Eğer bir modülün `.meta.json` dosyası eksikse, Swagger o modülü atlar.
- Validation tanımlanmamış rotalar boş body şeması ile gösterilir.
- Swagger UI üzerinden direkt endpoint testleri yapılabilir (JWT Token girilerek).

---

# 🎯 Özet

Bu yapı sayesinde:
- Modüller değiştikçe Swagger otomatik güncellenir.
- Yeni modüller veya rotalar eklemek için Swagger tarafında hiçbir ekstra kod gerekmez.
- API dokümantasyonu her zaman **canlı** ve **doğru** kalır!

---
