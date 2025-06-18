
---

# 🚀 **MetaHub Multi-Tenant Backend Dokümantasyonu**

---

## 1. **Genel Mimari & Yapı**

* **Tek bir backend kod tabanı** ile onlarca müşteri (tenant) aynı anda izole çalışır.
* Her tenant’ın **kendi MongoDB veritabanı** olur.
  (Örn: `metahub-main`, `ensotek-main`, `koenigsmassage-main`)
* Domain bazlı, header bazlı veya env değişkeniyle tenant ayrımı yapılır.
* **Tüm konfigürasyonlar**, logging, çoklu dil, i18n, validation ve modül mimarisi dinamik yapılmıştır.

---

## 2. **Başlangıç: Kurulum ve .env Yönetimi**

### A) Gereksinimler

* Node.js 18+
* MongoDB sunucusu (her tenant için ayrı veritabanı)
* PM2 (production process manager)
* Cloudinary, SMTP, vs (isteğe bağlı entegrasyonlar)

### B) Örnek .env Dosyası

Her environment için tek `.env` dosyası:

```
NODE_ENV=production
PORT=5019
MONGO_URI=mongodb://username:pass@host:27017/
JWT_SECRET=super-secret
LOG_LOCALE=tr
SMTP_HOST=smtp.example.com
SMTP_USER=info@example.com
SMTP_PASS=xxx
CLOUDINARY_URL=cloudinary://xxx
...
```

> **Not:** Hiçbir tenant’a özel veri bu dosyada olmamalı; sadece global/shared bilgiler.

---

## 3. **Tenant Algılama (Dinamik Model Injection)**

### A) Tenant Belirleme

* Header: `X-Tenant: ensotek`
* veya Subdomain/Host: `tenant.domain.com`
* veya Query: `?tenant=ensotek`

### B) Tenant Middleware

Her request’te Express middleware ile tenant tespit edilir, request’e eklenir:

```ts
export const injectTenantModel = (req, res, next) => {
  // ör: X-Tenant header, hostname, subdomain
  req.tenant = resolveTenantFromRequest(req);
  req.getModel = async (modelName, schema) =>
    getTenantModel(req.tenant, modelName, schema);
  next();
};
```

* Tüm modeller (`User`, `Product`, `Order` vs.) dinamik olarak tenant’a göre bağlanır.

---

## 4. **Çoklu Dil (i18n) ve Locale Awareness**

* **Her modülde** kendi çeviri dosyaları (`/i18n/tr.json`, `/i18n/en.json`, ...).
* Her istek için locale şu sırayla belirlenir:
  query → body → header (`Accept-Language`) → .env → `"en"`
* Çoklu dil alanlar her zaman şu tipte tanımlanır:

  ```ts
  export type TranslatedLabel = Record<SupportedLocale, string>;
  ```
* **Hiçbir yerde** `name.en` gibi hardcoded kullanım yoktur!

---

## 5. **Tenant-Aware Logging ve Analytics**

* Tüm loglarda şu bilgiler zorunlu:
  `tenant`, `module`, `event`, `status`
* Örnek log:

  ```json
  {
    "event": "product.create",
    "tenant": "ensotek",
    "module": "product",
    "status": "success",
    "message": "Ürün başarıyla eklendi."
  }
  ```
* PM2, Winston veya başka log sistemine entegre çalışır.

---

## 6. **API Katmanı & Modularite**

* Her modül kendi controller, model, validation, i18n, types dosyası ile gelir.
* **getTenantModels(req)** ile **her controller’da** tenant’a özel model çekilir:

  ```ts
  const { Product } = await getTenantModels(req);
  ```
* Tüm endpointler dinamik, multi-tenant yapıda çalışır.

---

## 7. **Deployment & PM2 Yönetimi**

### A) **Production PM2 Script’i**

#### 1. **build**

```bash
npm run build
# veya
bun run build
```

#### 2. **PM2 process config (ecosystem.config.js)**

```js
module.exports = {
  apps: [
    {
      name: "metahub-backend",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5019,
        // diğer .env key’leri
      },
    },
  ],
};
```

#### 3. **Başlatma**

```bash
pm2 start ecosystem.config.js --only metahub-backend
pm2 logs metahub-backend
pm2 save
pm2 restart metahub-backend
```

> **Not:** Her yeni deployment’da build ve PM2 restart gerekir.
> **Log’lar PM2 ile tail edilir.**

---

## 8. **Tenant Eklemek / Çıkarmak**

* Yeni bir müşteri (tenant) eklemek için:

  1. MongoDB’de yeni bir database oluştur (örn: `guezelwebdesign-main`)
  2. Admin panelden veya API’den tenant’a özel ayarları/tanımları ekle
  3. DNS ve domain ayarlarını yap (örn: `guezelwebdesign.de` ile çalışsın)
* Mevcut bir tenantı silmek:
  DB’yi sil, domain yönlendirmesini kaldır, backend’i yeniden başlat.

---

## 9. **Yedekleme ve Gelişmiş Bakım**

* Tüm tenant’lar **tamamen birbirinden izole** olduğu için veri güvenliği yüksektir.
* Dilersen backup ve restore işlemlerini tenant bazında yapabilirsin.
* Log ve analytics’te de tenant bazında izleme mümkün.

---

# 💡 **Sonuç**

* Tek backend = onlarca ayrı müşteri!
* Tenant’a özel veri, içerik, ayar, log, analytics, dil ve tema yönetimi.
* **Sıfır hardcoded tenant bilgisi!**
* Full scalable ve future-proof!

---

---

# 🌐 **MetaHub Multi-Tenant Frontend Dokümantasyonu**

---

## 1. **Genel Mimari & Yapı**

* **Tek bir frontend kod tabanı** ve tek build ile onlarca tenant desteklenir.
* Her tenant’ın kendi domaini/subdomaini olabilir.
* **Tüm içerik, tema, ayar, logo, vs.** backend’den API ile dinamik olarak çekilir.

---

## 2. **.env ve Build Yönetimi**

### A) **Ortak .env Dosyası**

Sadece environment-agnostic/public bilgiler burada:

```
NEXT_PUBLIC_API_URL=https://api.metahub.com
NEXT_PUBLIC_APP_ENV=metahub
# (gerekirse) NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=...
```

### B) **Tek Build, Çok Tenant**

* Bir kere build alınır (`next build`).
* Çıkan dosya (örn: `.next`) tüm tenant’lara deploy edilir.
* Domain bazlı veya deployment dizini bazlı her tenant farklı klasörde yaşayabilir, içerik yine backend’den gelir.

---

## 3. **Tenant Ayrımı ve Header Aktarımı**

* **apiCall** fonksiyonu `X-Tenant` header’ını her request’e ekler:

  ```js
  const tenant = process.env.NEXT_PUBLIC_APP_ENV;
  headers: { ...(tenant ? { "X-Tenant": tenant } : {}) }
  ```
* Domain/subdomain’e göre otomatik algılatmak istiyorsan;

  * `window.location.hostname` üzerinden tenantı çıkartıp header’a yazabilirsin (isteğe bağlı, advanced use-case).

---

## 4. **Ayar ve İçeriğin Dinamik Yüklenmesi**

* Uygulama başlarken (ör: `InitSettingsLoader`) backend’den `/settings`, `/company-info`, `/themes` gibi endpoint’lere istek atılır.
* Logo, title, favicon, iletişim, tema gibi bilgiler store’a yazılır, component’ler buradan okur.
* Hiçbir **hardcoded** şirket/tenant bilgisi frontend kodunda olmaz.

---

## 5. **Dil (i18n) Yönetimi**

* Tüm diller ortak dosyalarda, tenant’a özel dil yok.
* Kullanıcının browser dili veya seçimi otomatik olarak `i18n.changeLanguage()` ile ayarlanır.

---

## 6. **Tema (ThemeProvider) ve Özelleştirme**

* Backend’den gelen tema ayarı Redux store’a yazılır.
* ThemeProvider (ör: styled-components) ilgili temayı store’dan okur ve uygular.
* Tenant’a göre tema değişimi runtime’da backend’den çekilerek olur.

---

## 7. **SEO & Head Yönetimi**

* SSR/SSG varsa, tenant ayarlarını backend’den `getServerSideProps` ile çeker, head/meta dinamik oluşturur.
* SPA ise, client-side fetch sonrası document.title/logo vs. güncellenir.

---

## 8. **Deploy & Domain Yönetimi**

* Build sonrası çıkan dosya tüm tenant’ların sunucusuna dağıtılır.
* Her domain, kendi backend’ine ve doğru API endpoint’ine bağlanır (Nginx veya başka bir proxy ile yönlendirme yapılabilir).

---

## 9. **Tenant’a Yeni Müşteri Eklemek**

1. Yeni domain veya subdomain açılır (`koenigsmassage.de`)
2. DNS yönlendirmesi yapılır.
3. Aynı frontend build deploy edilir.
4. Backend’de yeni tenant açılır, frontend otomatik tenant olarak çalışır.

---

## 10. **Özet Kontrol Listesi**

| Kontrol Noktası                           | Açıklama |
| ----------------------------------------- | -------- |
| Tek build ile tüm tenantlara deploy       | ✔️        |
| Tüm ayar/backend verisi API’den çekiliyor | ✔️        |
| Hardcoded tenant/company info yok         | ✔️        |
| Tema/dil dinamik olarak çekiliyor         | ✔️        |
| X-Tenant header’ı her request’te gidiyor  | ✔️        |

---

# 🔁 **Sıkça Sorulanlar & Troubleshooting**

* **S: Yeni tenant için frontend’i tekrar build etmem gerekir mi?**
  **C:** Hayır, sadece backend’e yeni tenant ekleyip, yeni domaini yönlendir yeterli.

* **S: Bir tenant’ın logosunu, temasını nasıl değiştiririm?**
  **C:** Admin panelden veya backend’den ilgili ayarı güncelle, frontend otomatik olarak yeni bilgiyi alır.

* **S: Tenant’a özel dil dosyası gerekir mi?**
  **C:** Gerekmez. Her tenant aynı dil dosyalarını kullanır. İçerik backend’den gelir.

* **S: .env’de gizli tenant’a özel bilgi tutabilir miyim?**
  **C:** Güvenlik ve yönetim açısından önerilmez. Her şey backend’den dinamik çekilmeli.

---

# 🎉 **Başarıyla Multi-Tenant Yapıya Geçtiniz!**

Bu dokümantasyon, hem yeni ekip üyeleri hem de uzun vadeli bakım için **referans** olarak kullanılabilir.
Daha gelişmiş örnekler, deploy scriptleri veya tenant otomasyonları gerekiyorsa ayrıca yazabilirim.

---

**Sonraki adım:**
Frontend veya backend’de canlı test ve yeni tenant ekleme süreci için hazır olduğunda bana bildir, birlikte proof-of-concept çıkarabiliriz.

---
