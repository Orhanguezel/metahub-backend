
---

# 🚀 **MetaHub Multi-Tenant Backend Tenant Sistemi Dokümantasyonu (2025)**

---

## 1. **Genel Mimari:**

* Tek bir backend kod tabanından **birden fazla müşteri (tenant)** izole şekilde servis alır.
* Her tenant’ın **farklı MongoDB veritabanı** bulunur; bağlantı bilgisi (mongoUri) doğrudan veritabanındaki Tenant koleksiyonunda saklanır.
* Her istek, hangi tenant’a aitse onunla bağlantı kurar; hiçbir veri başka tenant ile karışmaz.
* Tenant tespiti **header veya domain (host)** ile otomatik yapılır.
* **Modül bazlı model injection** ile her endpoint, doğru tenant context’inde çalışır.
* **Logger ve analytics** tüm işlemlerde tenant bazında ayrı ayrı log üretir.

---

## 2. **Tenant Tespiti & Injection Akışı**

### A) **Tenant Tespiti** (`resolveTenant.ts`)

* Her istek geldiğinde şu sıralama ile tenant belirlenir:

  1. **Header:** Eğer `X-Tenant` header'ı varsa, sadece superadmin için override olarak kullanılır.
  2. **Host/Domain:** Domain veya subdomain, doğrudan veritabanındaki Tenants koleksiyonunda `domain.main` ile eşlenir.
  3. **Fallback:** Tanımlı değilse hata döner.
* Tenant tespit edildikten sonra, `req.tenant` (slug) ve `req.tenantData` alanlarına atanır ve loglanır.
* (Opsiyonel) Sadece superadmin’e tenant override hakkı tanınabilir.

---

### B) **Tenant Middleware ile Model Injection** (`injectTenantModel.ts`)

* Tespit edilen tenant slug ile request’e dinamik model bağlama fonksiyonu eklenir:

  * `req.getModel(modelName, schema) → Model`
* Tenant injection işlemi başarılı ise loglanır (tenant, host, event vs.).

---

### C) **Model Registry ve Model Cache** (`modelRegistry.ts`)

* Her tenant ve model ismi için, cache edilmiş Mongoose model instance’ı kullanılır.
* **modelCache**: `{ "tenant_modelName": ModelInstance }`
* Her yeni tenant veya model için önce DB connection alınır, sonra model tanımlanır ve cache’e alınır.

---

### D) **DB Connection Yönetimi** (`tenantDb.ts`)

* Her tenant için ayrı bir Mongoose Connection açılır ve cache edilir (`connections[tenant]`).
* DB bağlantı bilgisi **veritabanındaki Tenant kaydındaki** `mongoUri` alanından okunur.
* Bağlantı açılırken, hata ve başarı loglanır.
* Eksik veya hatalı bağlantıda descriptive error ve log üretilir.
* Bağlantı açıldıktan sonra tekrar kullanılmak üzere cache edilir.

---

## 3. **Tenant Mapping ve Konfigürasyon** (Artık Sadece DB’de!)

* Her domain/subdomain için Tenants koleksiyonunda bir kayıt bulunur:

  ```json
  {
    "name": { "en": "Demo Tenant" },
    "slug": "demo",
    "mongoUri": "mongodb://admin:adminpw@localhost:27017/demo-tenant",
    "domain": { "main": "demo.example.com" },
    ...
  }
  ```
* Mapping ya da `.env.{tenant}` dosyası gereksizdir.
* Tenant eklemek için sadece Tenants koleksiyonuna yeni bir kayıt eklemek yeterlidir.

---

## 4. **Tenant-aware Model Kullanımı ve Modül Injection**

### A) **getTenantModels.ts / getTenantModelsFromConnection.ts**

* Her endpoint veya controller başında:

  ```js
  const { User, Product, Order, ... } = await getTenantModels(req);
  ```
* Bu fonksiyon, istekten tenant’ı bulur ve ilgili tüm Mongoose modellerini (User, Product vs.) tenant’ın connection’ı üzerinden oluşturup döner.
* **Her model** kendi schema’sı ile, tenant context’inde, ayrı DB’de çalışır.
* Bazı advanced işlemlerde (ör: batch processing) doğrudan connection üzerinden tüm modeller alınabilir (`getTenantModelsFromConnection(conn)`).

---

### B) **Modül Geliştirme Standartları**

* Her modülün modeli **schema** olarak export edilir.
* Tüm CRUD işlemlerinde, doğrudan global model değil, **tenant’a özel model** kullanılır.

  ```js
  const { Product } = await getTenantModels(req);
  await Product.find({ ... });
  ```

---

## 5. **Logger ve İzlenebilirlik**

* Her tenant işlemi, ilgili logger’a (`logger.info`, `logger.error`) tenant context’i ile loglanır.
* Loglar tenant klasörlerinde tutulur (`/logs/{tenant}/YYYY-MM-DD.log`).
* Bağlantı, model cache, hata, tespit, injection gibi tüm kritik eventler loglanır.

---

## 6. **Çoklu Tenant’a Yeni Tenant Ekleme**

* **Yeni tenant eklemek için:**

  1. **Tenants koleksiyonuna yeni kayıt ekle** (gerekli tüm alanlarla, özellikle mongoUri ve domain.main).
  2. Gerekirse ilgili domain için DNS yönlendirmesi yap.
  3. Sistem canlı çalışırken bile yeni tenant otomatik olarak tanınır.
* Silmek için:

  * Tenants koleksiyonundan kaydı sil, ilgili tenant DB’sini temizle.

---

## 7. **Güvenlik ve İzolasyon**

* Hiçbir tenant başka bir tenant’ın datasına erişemez (model ve connection tamamen izole).
* Tenant header’ı override etmek için yetki kontrolü (ör: sadece superadmin) kullanılabilir.
* Hatalı tenant, eksik mapping veya bağlantı sorununda descriptive log ve error üretilir.

---

## 8. **Standart Güncelleme & Checklist**

| Kontrol Noktası                               | Açıklama                             |
| --------------------------------------------- | ------------------------------------ |
| Her istekte doğru tenant tespiti var mı?      | Header veya domain ile               |
| Her model tenant context’i ile mi üretiliyor? | Global yerine tenant özel model      |
| Her tenant’ın mongoUri alanı güncel mi?       | Tenants koleksiyonunda               |
| Her modülün modeli export schema ile mi?      | Model injection’da schema gereklidir |
| Loglar tenant bazında tutuluyor mu?           | /logs/{tenant}/ klasöründe           |
| Tenant override sadece yetkiliye mi açık?     | Superadmin kontrolü var mı?          |

---

## 9. **Kod ve Fonksiyon Sorumlulukları**

### **injectTenantModel.ts**

* Express middleware olarak her request’te tenant’ı tespit eder ve
* Request objesine `tenant` (slug) ve dinamik `getModel` fonksiyonunu ekler.

### **modelRegistry.ts**

* Tenant ve model bazında model instance cache’ler.
* Her yeni model veya tenant için connection açar, tekrar kullanır.

### **tenantDb.ts**

* Tenant’a özel bağlantıyı, Tenants koleksiyonundaki `mongoUri` ile açar ve cache’ler.

### **resolveTenant.ts**

* Header ve domain üzerinden tenant tespiti ve doğrulaması yapar (artık DB üzerinden).
* (Opsiyonel) Sadece superadmin’e tenant override izni tanır.

### **getTenantModels.ts / getTenantModelsFromConnection.ts**

* İlgili tenant connection’ı üzerinden tüm modelleri schema ile instantiate eder.
* Controller ve servislerde doğru model ile çalışmayı sağlar.

---

## 10. **Kısa Özet / TL;DR**

* Tüm sistem **modüler, dinamik, tenant-aware ve scalable** olarak tasarlanmıştır.
* Her istek başında tenant tespit edilir, izole model ve bağlantı ile işlem yapılır.
* Tenant ekleme/çıkarma sadece DB’ye kayıt ekle/sil ile mümkündür.
* Her model, her bağlantı ve her log **tamamen tenant’a izole** çalışır.

---

### Herhangi bir dosya/alan/kod örneği ya da örnek tenant kaydı istersen yazabilirsin!
