
---

# 🚀 **MetaHub Multi-Tenant Backend — Yeni Script & Modül Mimarisi Yol Haritası**

## 1️⃣ **Ana Hedefler ve Kapsam**

* Her tenant'ın modülleri ve meta bilgisi **%100 izole** yönetilmeli.
* Tüm scriptler **tenant context-aware** olmalı, asla global koleksiyon/dosya karışıklığı olmamalı.
* Her tenant, kendi meta-config, dosya, DB ve loglarıyla *tamamen ayrı* tutulmalı.
* Yeni modül ekleme, kaldırma ve güncelleme işlemleri otomatize, tekrarlanabilir, sade ve hatasız olmalı.
* Çok dilli ve logger standartlarına %100 uyumlu olmalı.

---

## 2️⃣ **Dosya ve Dizin Yapısı (Önerilen)**

```plaintext
/scripts/
  createModule/
    createModule.ts
    createMetaFile.ts
    writeModuleFiles.ts
    fileTemplates.ts
    utils.ts
    createModule.md
    i18n/
      tr.json
      en.json
      ...
  generateMeta/
    generateMeta.ts         // <-- Entry point (CLI)
    helpers/
      extractRoutes.ts
      fixMissingModuleSettings.ts
      updateMetaVersion.ts
      ...
    i18n/
      tr.json
      en.json
      ...
    configs/
      generateMeta.config.ts
      tenants.json
  meta-configs/
    {tenant}/               // Her tenant için ayrı klasör
      {module}.meta.json
      ...
  logs/
    {tenant}/
      YYYY-MM-DD.log
```

> **Not:**
> Her tenant için `/meta-configs/{tenant}/` ve `/logs/{tenant}/` ayrımı %100 zorunlu.
> Tüm tenant işlemleri, dosya ve db hareketleri bu contextte yürütülmeli.

---

## 3️⃣ **GENEL Script ve API Prensipleri**

* Tüm script ve API endpointlerinde, **`tenant` parametresi zorunlu** olacak.
* Scriptler CLI’dan çağrıldığında `--tenant` argümanı veya env üzerinden (`TENANT_NAME`) çalışmalı.
* **Her dosya, log ve db işlemi o tenant contextinde çalışacak.**
* Logger ve çeviri sistemi her işlemde kullanılacak.
  (örn: `logger.info(t("meta.success", locale, translations, { ... }) ...)`)
* **Çoklu tenant için toplu güncelleme** yapılacaksa, `for...of` ile tüm tenantlar üzerinde *ayrı ayrı* çalışılacak.

---

## 4️⃣ **`generateMeta` (Meta Oluşturucu) Scripti — YENİ AKIŞ**

### a) **Script Girişi:**

* CLI veya programatik çağrı ile çalıştırılır:

  ```sh
  node scripts/generateMeta/generateMeta.ts --tenant=ensotek
  # veya
  TENANT_NAME=anastasia node scripts/generateMeta/generateMeta.ts
  ```
* Eğer toplu çalıştırılacaksa:

  ```sh
  node scripts/generateMeta/generateMeta.ts --all
  ```

  ve script kendisi tüm `tenants.json`’daki tenantlar üzerinde döner.

### b) **Her Tenant İçin İzole Akış:**

* `meta-configs/{tenant}/` dizini hazırlanır (varsa geç, yoksa oluştur).
* Her modül için:

  * meta dosyası yazılır/güncellenir:
    `meta-configs/{tenant}/{modul}.meta.json`
  * DB’de `ModuleMeta` ve `ModuleSetting` güncellenir:
    Her query’de mutlaka `tenant: ...` filterı var!
* “Orphan” temizliği ve modül silme/güncelleme/deactivate işlemleri de sadece ilgili tenant contextinde yapılır.

### c) **Logger ve Dil Kullanımı**

* Scriptin her yerinde:

  ```ts
  logger.info(
    t("meta.meta.writeSuccess", locale, translations, { mod, tenant }),
    { tenant, ... }
  );
  ```
* Hatalar, uyarılar ve diğer eventler tenant loguna, ilgili dille (veya default ile) yazılır.

### d) **Tenant-a Özel DB Model Injection**

* Her tenant için;

  ```ts
  const conn = await getTenantDbConnection(tenant);
  const { ModuleMeta, ModuleSetting } = getTenantModelsFromConnection(conn);
  ```
* Böylece tenantlar asla karışmaz!

---

## 5️⃣ **`createModule` (Modül Generator) Scripti — YENİ AKIŞ**

* Modül dosyalarını ve şablonlarını tenant-agnostic şekilde,
  **standart best-practice şablonları** ile üretir (çoklu dil, log, tenant-aware kod örnekleri ile).
* **Her yeni modül**:

  * Mongoose modelinde `TranslatedLabel`, schema’larda otomatik çoklu dil alanları,
  * i18n dosyaları (`en.json`, `tr.json` ...),
  * Logger kullanımı,
  * getTenantModels injection örnekleri ile gelir.
* Gerekirse tenant bazında örnek usage gösterir (ama modül şablonu tenant-agnostic olur).

---

## 6️⃣ **ESKİ KODLARI/UTILS’i KULLANMAK**

* **Mevcut utils ve helpers** dosyaların (ör: `extractRoutes.ts`, `normalizeMetaObject.ts`)
  doğrudan yeni yapıya adapte edilebilir.
* *Önemli olan*: **Her fonksiyonda tenant context’i parametre olarak alınacak veya scriptin başında tanımlanacak**.

---

## 7️⃣ **CHECKLIST & DENETİM (Geliştirme/Review için)**

| Adım                                                               | Zorunlu/Yapılmalı |
| ------------------------------------------------------------------ | ----------------- |
| \[ ] Her meta/config ve dosya işlemi tenant path’inde mi?          | Evet              |
| \[ ] Her DB query’sinde tenant field var mı?                       | Evet              |
| \[ ] Logger ve translate her eventte kullanılıyor mu?              | Evet              |
| \[ ] CLI’da tenant belirlemek zorunlu mu?                          | Evet              |
| \[ ] Scriptler tenant-loop ile “toplu” çalışabiliyor mu?           | Evet              |
| \[ ] Modül generator scripti full best-practice export ediyor mu?  | Evet              |
| \[ ] Her yeni modül output’u future-proof, scalable ve i18n-ready? | Evet              |

---

## 8️⃣ **SONUÇ — KOD PARÇASI İLE ÖRNEK**

```ts
// generateMeta.ts
import tenants from "@/core/middleware/tenant/tenants.json";

async function runForTenant(tenant: string) {
  const locale = getLogLocale();
  const conn = await getTenantDbConnection(tenant);
  const models = getTenantModelsFromConnection(conn);
  const metaDir = path.join(process.cwd(), "src/meta-configs", tenant);

  // Dosya işlemleri, DB update'leri burada!
  // Her queryde: models.ModuleMeta.updateOne({ name: mod, tenant }, ...)
  // Her logger’da: logger.info(..., { tenant, ... })
}

if (process.env.TENANT_NAME) {
  runForTenant(process.env.TENANT_NAME);
} else if (process.argv.includes("--all")) {
  for (const tenant of Object.values(tenants)) {
    runForTenant(tenant);
  }
} else {
  throw new Error("Tenant belirtmelisin! --tenant=xyz veya TENANT_NAME env ile.");
}
```

---

# 🎯 **YOL HARİTASI (Özet)**

1. **Her yerde tenant context zorunlu**: Dosya, DB, logger, config, API.
2. **Her fonksiyonda tenant parametresi veya context injection**.
3. **Meta-config ve loglar, /meta-configs/{tenant}/ ve /logs/{tenant}/ altında**.
4. **CLI & scriptlerde tenant belirtmek zorunlu.**
5. **Her modül future-proof, i18n, logger ve tenant injection’lı şablonla otomatik oluşturulmalı.**
6. **Tüm eski kodları tenant-loop ve context-aware olarak refactor et** (mevcut helpers rahatça kullanılabilir).
7. **Her PR/code-review’da checklist ile denetle**.

---
