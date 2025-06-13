
---

# 🏢 **Metahub Tenant (Multi-Tenant) Sistem Entegrasyonu**

## 📌 Amaç

Metahub artık çok kiracılı (multi-tenant) bir yapıdadır. Her tenant (müşteri):

* Kendi `.env.{tenant}` dosyasına sahip
* Kendi veritabanı bağlantısını kullanır
* Aynı kod altyapısı içinde izole şekilde çalışır
* Dil, stil, tema ve verilerle birbirinden ayrıdır

---

## 🧩 1. Genel Yaklaşım

### ✔ Hedefler:

✅ `.env.{tenant}` dosyasından bağlantı sağlanır
✅ Tenant’a özel Mongo connection açılır ve cache’lenir
✅ Modeller tekrar tanımlanmaz, tenant+model ikilisi cache’lenir
✅ Tüm işlemler `req.hostname` üzerinden tenant belirlenerek yürütülür
✅ Tüm controller’lar `getTenantModels(req)` üzerinden model çeker
✅ Logger ve çeviri (`translate`) fonksiyonları tenant-aware çalışır

---

## ⚙️ 2. Ana Altyapı Dosyaları

### 📁 `tenantDb.ts`

```ts
export const getTenantDbConnection = (tenant: string): mongoose.Connection => {
  // dotenv ile .env.{tenant} dosyasını yükle
  // URI ile mongoose.createConnection
  // connection cache’le
};
```

---

### 📁 `modelRegistry.ts`

```ts
export const getTenantModel = <T>(tenant: string, modelName: string, schema: Schema<T>): Model<T> => {
  // tenant+modelName kombinasyonuna göre model oluşturur veya cache'den döner
};
```

---

### 📁 `resolveTenant.ts`

```ts
export const resolveTenantFromHost = (host: string): string => {
  const normalized = host.toLowerCase();

  if (normalized.includes("metahub.localhost")) return "metahub";
  if (normalized.includes("anastasia.localhost")) return "anastasia";
  if (normalized.includes("guezelwebdesign.com")) return "metahub";
  if (normalized.includes("koenigsmassage.com")) return "anastasia";

  return "default";
};
```

---

### 📁 `injectTenantModel.ts`

```ts
req.tenant = resolveTenantFromHost(req.hostname);

req.getModel = <T = any>(modelName: string, schema: Schema<T>): Model<T> => {
  return getTenantModel<T>(req.tenant, modelName, schema);
};
```

✅ Ayrıca global olarak `Express.Request` arayüzüne `getModel` ve `tenant` tanımlandı.

---

### 📁 `getTenantModels.ts`

```ts
export const getTenantModels = (req: Request) => ({
  Setting: req.getModel("Setting", Setting.schema),
  Product: req.getModel("Product", Product.schema),
  // ...
});
```

💡 Tüm controller’lar sadece bu dosya üzerinden modele erişir.

---

## 🏗 3. Uygulama Başlatma

### 📁 `server.ts` ya da `app.ts` içeriği:

```ts
app.use(setLocale);
app.use(injectTenantModel); // Tenant injection burada yapılmalı
```

---

## 🧪 4. İlk Uygulanan Modül: `Setting`

* `getTenantModels(req)` ile model çağrıldı
* `fillAllLocales()` ile dil alanları normalize edildi
* `translate()` ve `getLogLocale()` ile tenant-aware dil desteği sağlandı
* `logger.info(...)` içindeki `tenant`, `event`, `module`, `status` alanları eksiksiz eklendi

---

## 📂 5. Geliştirme / Gözden Geçirme Listesi

| Alan                                                                    | Durum                |
| ----------------------------------------------------------------------- | -------------------- |
| `getModel` yerine `getTenantModels` kullanımı                           | ✅ Çoğu modülde tamam |
| `.env.{tenant}` dosyalarının oluşturulması                              | ✅ Uygulandı          |
| Tüm `i18n` dizinlerinde çok dilli `index.ts` + `en.json`, `tr.json` vs. | ✅ Var                |
| Upload klasörlerinin tenant’a göre ayrılması (`/uploads/{tenant}/...`)  | ✅ Uygulandı          |
| Swagger + Postman tenant bazlı testlerle uyumlu hale getirildi          | ✅ Tamamlandı         |
| Admin panelde tenant switcher özelliği                                  | 🔜 Planlanabilir      |

---

## 📖 Controller İçinde Örnek Kullanım

```ts
const { Setting } = getTenantModels(req);
const t = (key) => translate(key, req.locale || getLogLocale(), translations);

const result = await Setting.findOne({ key: "site_template" });

logger.info(t("setting.update.success"), {
  tenant: req.tenant,
  event: "setting.update",
  module: "setting",
  status: "success",
  key: "site_template",
});
```

---

## 🔐 İzolasyon Güvencesi

* Tüm modeller ve bağlantılar tenant’a özeldir
* Farklı tenant’ların verileri aynı modelde karışmaz
* `mongoose.createConnection()` sayesinde `bufferCommands = false` ile izole model oluşturulur
* Hatalı hostname için fallback tenant `default` tanımlıdır

---

## 🛠️ Yeni Tenant Ekleme Talimatı

Yeni bir tenant eklemek için aşağıdaki 3 adımı uygulayın:

1. `.env.{tenant}` dosyasını oluştur:
   Örn: `.env.ensotek`, `.env.metahub`, `.env.anastasia`

2. `resolveTenantFromHost.ts` içerisine alan adını tanımla:

   ```ts
   if (host.includes("ensotek.localhost")) return "ensotek";
   if (host.includes("ensotek.de")) return "ensotek";
   ```

3. Gerekirse özel model gerekiyorsa `getTenantModels.ts` içerisine model ekle:

   ```ts
   EnsotekProduct: req.getModel("EnsotekProduct", EnsotekProduct.schema),
   ```

---

## ✅ Avantajlar

✔ Çok kiracılı veri ve dosya izolasyonu
✔ Performanslı model ve bağlantı cacheleme
✔ Controller bazlı sade kod yapısı
✔ Dinamik dil ve tema desteği
✔ Geliştirici dostu konfigürasyon yapısı

---
