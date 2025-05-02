

---

# 🎯 Metahub Backend Modül Standartlarımız (Güncel)

| #  | Standard |
|:---|:---------|
| 1  | **Tüm controller fonksiyonları** `asyncHandler(async (req, res, next): Promise<void> => { ... })` yapısında olacak. Ek olarak tüm handler'larda ilgili model **`@/modules/...`** üzerinden import edilecek (örnek: `import { Product } from "@/modules/product";`). |
| 2  | **Tüm `res.status().json()` sonrası return alt satıra yazılacak.** (net hata dönüşü için) |
| 3  | **Public ve Admin endpointleri ayrı ayrı organize edilecek.** `/routes/` dosyaları `publicRoutes`, `adminRoutes` şeklinde ayrılacak. |
| 4  | **Validation zorunlu.** `body`, `params`, `query` doğrulamaları her endpointte olacak. Validasyonlar `express-validator` ile yapılacak ve `validateRequest` middleware'i ile bitirilecek. |
| 5  | **Hata mesajları sade, İngilizce ve temiz olacak.** İsteğe göre çok dilli (EN/TR/DE) sistem kullanılabilir. |
| 6  | **Middleware kullanımı eksiksiz olacak:** `authenticate`, `authorizeRoles("admin")` gibi kontroller standart olacak. |
| 7  | **HTTP hata kodları doğru kullanılacak:** `400`, `401`, `403`, `404`, `422`, `500` gibi status kodları senaryoya göre net belirlenecek. |
| 8  | **Tüm Mongoose sorgularında `isValidObjectId` validasyonu yapılacak.** (Örneğin `update` ve `delete` işlemlerinde `id` kontrolü) |
| 9  | **.env dosyaları dinamik alınacak:** (`process.env.APP_ENV`, `ACTIVE_META_PROFILE`). Herhangi bir config değeri direkt hardcoded olmayacak. |
| 10 | **Model dosyasında şu yapı olacak:** <br> - `I[ModelName]` interface’i <br> - `Schema` tanımı <br> - **Model tanımı `Model<I[ModelName]>` olarak guard’lı şekilde yazılacak:**<br> `const X: Model<I[ModelName]> = models.X || model<I[ModelName]>("X", schema);` |
| 11 | **Model export’u: default export olacak.** Örneğin: `export default Product;`. |
| 12 | **index.ts yapısı standart olacak:** <br> - `router.use("/", routes);` <br> - `import Model, { IModel } from "./model";` <br> - `import * as controller from "./controller";` <br> - `import * as validation from "./validation";` <br> - Export: `{ Model, IModel, controller, validation }`. |
| 13 | **Alias kullanımı zorunlu:** Tüm importlar `@/modules/...` ve `@/core/...` gibi alias ile yapılacak. (tsconfig + path ayarları net olacak) |
| 14 | **Response yapıları tutarlı olacak:** Her başarılı cevap: `{ success: true, message, data }`, her hata: `{ success: false, message }`. |
| 15 | **Dosya yapısı net olacak:** <br> - `/routes/` <br> - `/controller/` <br> - `/models/` <br> - `/validation/` <br> - `/index.ts` <br> - `/__tests__/`. |
| 16 | **Model dosyası sadece Model + Schema içerecek. Controller ve route kodu olmayacak.** |
| 17 | **Her yeni modül `tools/createModule` script’iyle oluşturulacak. Script çıktısı yeni standarda uyumlu olacak.** |
| 18 | **Test dosyası (Jest + Supertest):** `/__tests__/${module}.controller.spec.ts` formatında otomatik oluşturulacak ve min 1 test tanımı olacak (örnek create testi). |
| 19 | **Slug veya özel alanlar varsa `pre("validate")` gibi Mongoose middleware'leri modelde tanımlanacak.** |
| 20 | **Tüm index.ts dosyalarında `export default router;` en sonda olacak.** |

---

# 🛠 ÖZEL NOTLAR:

- 🔐 **Validation Detayı:** Validasyonlar tek bir dosyada tutulacak (örneğin `product.validation.ts`), parametre/ID kontrolleri de burada yer alacak.

- 🛡 **Guardlı Model Tanımı:**  
  Her model şöyle olacak:

  ```ts
  const Product: Model<IProduct> =
    models.Product || model<IProduct>("Product", productSchema);

  export default Product;
  ```

- 🚀 **index.ts Kullanımı:**  
  Controller, Validation ve Model tek yerden export edilecek ki dashboard veya diğer dosyalar sadece şu şekilde import etsin:

  ```ts
  import { Product } from "@/modules/product";
  ```

- ✅ **Örnek Route:**  
  `/product.routes.ts` içinde route tanımı şu şekilde olacak:

  ```ts
  router.use(authenticate, authorizeRoles("admin"));
  router.post("/", validateCreateProduct, createProduct);
  ```

---

# 🚨 YENİ STANDART SONRASI:

✅ **Her modül tek tip:**  
- Model: %100 tip garantili, guardlı, default export  
- Controller: Modülü `@/modules/...` alias’ından çekiyor  
- Validation: `express-validator` ile tam uyum  
- Route: Aliased, middleware uyumlu  
- Index: Tek noktadan export, full uyum 🚀

---
