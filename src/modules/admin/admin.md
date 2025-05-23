
---

# 🧩 Admin Modülü – MetaHub Backend

`/src/modules/admin/` klasörü, MetaHub sisteminde modül yönetimi, meta dosya oluşturma ve görünürlük ayarlarını merkezi şekilde yöneten yapıdır.  
Swagger üretimi, proje profiline göre modül aktivasyonu ve Admin Panel işlevleri bu modül üzerinden yürütülür.

---

## 📁 Dosya ve Yapı Açıklamaları

### 1. `/admin.controller.ts`

Admin işlemlerini yöneten ana controller'dır:

| Endpoint | Açıklama |
|:---------|:---------|
| `GET /admin/modules?project=...` | Belirli projedeki tüm modülleri listeler. |
| `GET /admin/module/:name` | Belirli bir modülün meta detayını döner. |
| `POST /admin/modules` | Yeni bir modül oluşturur. (meta dosyası + klasör) |
| `PATCH /admin/module/:name` | Mevcut bir modülün bilgilerini günceller. |
| `DELETE /admin/module/:name` | Mevcut bir modülü ve meta dosyasını siler. |
| `GET /admin/projects` | `.env.*` dosyalarına göre tüm projeleri listeler. |

> Tüm işlemler `authenticate` ve `authorizeRoles("admin")` middleware'leri ile korunur.

---

### 2. `/admin.routes.ts`

Express yönlendirme dosyasıdır.

- **POST /modules** ➔ Yeni modül oluşturur (`validateCreateModule`)
- **GET /modules** ➔ Tüm modülleri listeler
- **GET /module/:name** ➔ Modül detayını getirir (`validateModuleNameParam`)
- **PATCH /module/:name** ➔ Modül günceller (`validateUpdateModule`)
- **DELETE /module/:name** ➔ Modül siler (`validateModuleNameParam`)
- **GET /projects** ➔ Proje listesini döner

---

### 3. `/admin.validation.ts`

**express-validator** ile yazılmıştır.

| Validation Fonksiyonu | Açıklama |
|:----------------------|:---------|
| `validateCreateModule` | Modül oluştururken gerekli alanları doğrular. |
| `validateUpdateModule` | Modül güncellemesi sırasında opsiyonel alanları doğrular. |
| `validateModuleNameParam` | Modül isminin `params` içinde doğru geldiğini doğrular. |
| `validateProjectQuery` | `project` query parametresini doğrular. |

> `validateRequest` middleware kullanılarak hatalı istekler anında kesilir.

---

### 4. `/admin.models.ts`

- Sadece TypeScript tipi tanımlarını içerir.
- `ModuleMeta`, `ModuleSetting` tiplerini export eder.

Örnek:
```ts
export type ModuleMeta = {
  name: string;
  icon: string;
  visibleInSidebar: boolean;
  ...
};
```

---

### 5. `/moduleMeta.model.ts`

Veritabanında modüllerin meta verilerini tutar.

| Alan | Açıklama |
|:-----|:---------|
| `name` | Modül ismi |
| `label` | Çok dilli modül adı (`tr`, `en`, `de`) |
| `icon` | Admin menüdeki ikon |
| `roles` | Hangi roller erişebilir |
| `routes` | Swagger için tanımlı rotalar |
| `useAnalytics` | İstatistik kullanımı |
| `history` | Versiyon günlüğü |
| `updatedBy` | Son düzenleyen kullanıcı ve commitHash bilgisi |

> JSON dosyaları (`meta-configs/`) ile birebir uyumludur.

---

### 6. `/moduleSettings.model.ts`

Proje bazlı modül ayarlarını tutar.

| Alan | Açıklama |
|:-----|:---------|
| `project` | Hangi proje (`metahub`, `kuhlturm`, vs.) |
| `module` | Modül adı |
| `enabled` | Aktif/pasif |
| `visibleInSidebar` | Admin menüde görünürlük |
| `useAnalytics` | İstatistik kullanımı |
| `roles` | Roller bazlı görünürlük |
| `label` | Çok dilli adlandırma |

> `.env` dosyasındaki `ENABLED_MODULES` ile senkronize çalışır.

---

### 7. `/index.ts`

Admin modülünü **tek giriş** olarak dışa aktarır.

- `admin.routes.ts` → router
- `admin.controller.ts`, `admin.models.ts`
- `moduleMeta.model.ts`, `moduleSettings.model.ts`

Kullanım:
```ts
import adminModule from "@/modules/admin";
app.use("/admin", adminModule);
```

---

## ⚙️ Teknik Detaylar

- ✅ **Modül eklerken**: 
  - Veritabanına kayıt.
  - `src/meta-configs/metahub/` içinde `.meta.json` dosyası oluşturulur.
  - `src/modules/` altında Express yapısına uygun modül dosyaları oluşturulur.
- ✅ **Modül silerken**:
  - Veritabanından kayıt silinir.
  - İlgili `.meta.json` dosyası silinir.
- ✅ **Yapılandırmalar**:
  - `commitHash` ve `username` bilgileri otomatik eklenir.
  - Versiyonlama (`version: 1.0.1`, `history`) her zaman güncellenir.
  - Çoklu dil desteği (`tr`, `en`, `de`) her modül label'ında zorunludur.
- ✅ **Swagger Entegrasyonu**:
  - Tüm modüller Swagger UI içinde dinamik görünür.
  - Swagger JSON'unda her modül `tags` ve `paths` olarak yer alır.

---

## 🧠 Sistem Akışı (Özet)

```plaintext
Frontend Admin Panel ⟷ /admin endpoint ⟶
    createModule ➝ Veritabanına kayıt ➝ Meta JSON ➝ Modül klasörü
    updateModule ➝ Veritabanı ve Meta güncelleme
    deleteModule ➝ Veritabanı + Meta dosya silme
    getModules ➝ Modül ve ayar listesini döner
    getProjects ➝ .env profillerini listeler
```

---

## ✅ Bu Modül Ne İşe Yarar?

- 🔧 Yeni modül oluşturmayı sağlar (tam otomasyonlu).
- 🧩 Admin menü görünürlüğü ve rol bazlı erişimi kontrol eder.
- 🌐 Swagger üretimini destekler.
- 🗂️ Proje profiline göre modül yapılandırması yapar (`metahub`, `kuhlturm`, vs).
- 🧪 express-validator ile sağlam ve güvenli veri doğrulaması yapar.
- 🧠 Git bilgileri (username + commitHash) ve versiyon kontrolü sağlar.

---
