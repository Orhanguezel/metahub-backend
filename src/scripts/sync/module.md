Tabii, yüklediğin **masterSync.ts, healthCheckMetaSettings.ts, removeTenantSettings.ts, seedUtils.ts, seedSettingsForNewTenant.ts, seedSettingsForNewModule.ts, seedAllModuleMeta.ts** dosyalarını detaylıca analiz ederek
**MetaHub Backend Multi-Tenant Modül Yönetimi ve Sync Scriptleri için profesyonel, uygulamalı bir README Kullanım Rehberi** oluşturuyorum.

---

# 🟢 MetaHub Backend — **Multi-Tenant Modül Yönetimi ve Sync Scriptleri**

Bu rehber, MetaHub'ın yeni nesil multi-tenant modül altyapısında **meta ve ayar seed/repair/temizlik** scriptlerinin kullanımını açıklar.

Tüm scriptler **tenant izole**, **idempotent**, ve *asla gereksiz veri kaybına yol açmayan* şekilde tasarlanmıştır.
Her script **doğrudan CLI'dan** veya isterseniz otomasyon/pipeline ile manuel olarak çalıştırılır.

---

## **Temel Script Dosyaları ve Amaçları**

### 1️⃣ `masterSync.ts`

* **Toplu Sync ve Migration**:

  * Tüm modül/tenant meta & ayarlarını fiziksel dosya yapısına göre bulk olarak kontrol eder ve eksikleri tamamlar.
  * Orphan meta/setting siler.
  * Genellikle migration, büyük refactor sonrası veya major güncellemelerde, **manuel** çalıştırılır.
* **Çalıştırmak için:**

  ```sh
  npm run sync:all
  # veya doğrudan:
  npx ts-node -r tsconfig-paths/register src/scripts/sync/masterSync.ts
  ```

---

### 2️⃣ `healthCheckMetaSettings.ts`

* **Health Check & Repair**:

  * Tüm aktif tenant/modül kombinasyonunda eksik setting var mı kontrol eder, eksikleri oluşturur.
  * Data kaybı riski yok, sadece eksik olanları ekler.
* **Çalıştırmak için:**

  ```sh
  npm run sync:health
  # veya:
  npx ts-node -r tsconfig-paths/register src/scripts/sync/healthCheckMetaSettings.ts
  ```

---

### 3️⃣ `removeTenantSettings.ts`

* **Tenant Silme Temizliği**:

  * Bir tenant silindiğinde, ona ait tüm modül ayarlarını ve orphan olmuş meta/setting kayıtlarını siler.
  * **Güvenli, sadece belirtilen tenant'ı etkiler.**
* **Çalıştırmak için:**

  ```sh
  npm run sync:remove-tenant -- <tenantSlug>
  # veya:
  npx ts-node -r tsconfig-paths/register src/scripts/sync/removeTenantSettings.ts <tenantSlug>
  ```

  * **Örnek:**

    ```sh
    npm run sync:remove-tenant -- ensotek
    ```

---

### 4️⃣ `seedSettingsForNewTenant.ts`

* **Yeni Tenant Başlatma**:

  * Yeni bir tenant eklendiğinde, tüm mevcut modüller için o tenant'a ayar seed eder (mapping oluşturur).
  * Mevcut tenantlara tekrar çalıştırmak zararsızdır (sadece eksikse ekler).
* **Çalıştırmak için:**

  ```sh
  npm run sync:tenant -- <tenantSlug>
  # veya:
  npx ts-node -r tsconfig-paths/register src/scripts/sync/seedSettingsForNewTenant.ts <tenantSlug>
  ```

---

### 5️⃣ `seedSettingsForNewModule.ts`

* **Yeni Modül Başlatma**:

  * Yeni eklenen bir modülün tüm aktif tenantlarda mapping ayarlarını (setting) otomatik oluşturur.
* **Çalıştırmak için:**

  ```sh
  npm run sync:module -- <moduleName>
  # veya:
  npx ts-node -r tsconfig-paths/register src/scripts/sync/seedSettingsForNewModule.ts <moduleName>
  ```

---

### 6️⃣ `seedAllModuleMeta.ts`

* **Fiziksel Klasörlere Göre Meta Seed**:

  * `/src/modules` altındaki tüm fiziksel modül klasörlerine göre meta kaydı açar (sadece eksikse).
  * *Yedek, bulk migration veya meta-ayar bulk repair işlemlerinde kullanılır.*
* **Çalıştırmak için:**

  ```sh
  npm run sync:meta
  # veya:
  npx ts-node -r tsconfig-paths/register src/scripts/sync/seedAllModuleMeta.ts
  ```

---

### 7️⃣ `seedUtils.ts`

* **Yardımcı Fonksiyonlar**:

  * Bulk seed, repair ve sync işlemlerinde kullanılan ortak yardımcılar burada tutulur.
  * Scriptlerin çalışması için *otomatik dahil edilir*, ayrı çalıştırılmaz.

---

## **Senaryo ve Kullanım Akışı**

### **Yeni Bir Tenant Eklendiğinde:**

```sh
npm run sync:tenant -- <tenantSlug>
```

### **Yeni Bir Modül Eklendiğinde:**

```sh
npm run sync:module -- <moduleName>
```

### **Major Migration/Temizlik veya Refactor Sonrası:**

```sh
npm run sync:all
```

> (Fiziksel klasörleri, meta tabloları ve tüm ayar mappinglerini bulk olarak temizler & seed eder.)

### **Bir Tenant Silindiğinde:**

```sh
npm run sync:remove-tenant -- <tenantSlug>
```

### **Sağlık (Eksik Mapping Tamamlama) Kontrolü:**

```sh
npm run sync:health
```

---

## **Ekstra: Loglama ve İzlenebilirlik**

* Tüm scriptler kendi işlemlerini detaylı şekilde `logger` ile loglar.
* Her işlem idempotent: **Aynı scripti birden fazla kez çalıştırmak veri kaybı veya tekrar yaratmaz.**
* Tüm loglar ve script çıktısı ile, ne yapıldığı her zaman izlenebilir.

---

## **Best Practice**

* **Production veya staging’de bulk sync işlemleri** YALNIZCA migration/refactor sonrasında veya bilinçli şekilde yapılır.
* Yeni tenant veya modül eklendiğinde ilgili scriptleri çalıştırmak yeterlidir.
* Panelden modül ekleme/çıkarma işlemlerinde otomatik olarak da tetiklenebilir.
* Scriptler dışında manuel DB müdahalesi yapılmamalıdır.

---

## **Sık Kullanılan Komutlar (Özet Tablo)**

| Komut (npm run)     | Açıklama                                  |
| ------------------- | ----------------------------------------- |
| sync\:all           | Tüm sync ve migration işlemi              |
| sync\:meta          | Tüm fiziksel modülleri meta olarak ekler  |
| sync\:settings      | Tüm modül-tenant ayarlarını seed eder     |
| sync\:health        | Eksik mapping repair (health check)       |
| sync\:tenant        | Tek tenant için mapping açar              |
| sync\:module        | Tek modül için mapping açar               |
| sync\:remove-tenant | Bir tenant’ın tüm mapping/meta’sını siler |

---

## **Notlar & Ek Bilgi**

* Scriptlerin sırası ve mantığı multi-tenant isolation ve gelecekteki migration ihtiyaçlarına göre dizayn edilmiştir.
* Scriptlerde herhangi bir hata ile karşılaşırsanız `logger` çıktılarına bakarak hızlıca sebebini tespit edebilirsiniz.
* Herhangi bir bulk migration veya toplu panel operasyonu öncesi veritabanı yedeği almanız önerilir.

---

**MetaHub Multi-Tenant Modül Sync ve Seed Scriptleri —
Geleceğe hazır, izole, scalable, ve asla veri kaybına yol açmayan mimari!**

---