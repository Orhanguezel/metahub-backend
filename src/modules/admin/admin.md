
---

# 🧩 Admin Modülü – MetaHub Backend

`/src/modules/admin/` klasörü, MetaHub sisteminde modül yapılandırmalarını ve görünürlük ayarlarını yöneten merkezî bir yapı sağlar. Swagger üretimi, admin görünürlüğü ve proje profili bazlı modül yönetimi gibi birçok temel işlev burada tanımlıdır.

---

## 📁 Dosya ve Yapı Açıklamaları

### 1. `/admin.controller.ts`

Modülün API endpoint’lerini tanımlar:

| Endpoint                         | Açıklama                                                                 |
|----------------------------------|--------------------------------------------------------------------------|
| `GET /admin/modules?project=...` | Belirli bir proje için tüm modülleri listeler                           |
| `PATCH /admin/modules/:name`     | Belirli bir modülün görünürlük, ikon, rol gibi ayarlarını günceller     |
| `GET /admin/projects`            | `.env.*` dosyalarına göre tüm mevcut projeleri döner (`getEnvProfiles`) |

> **Not:** `PATCH` endpoint'inde gelen veriler `admin.validation.ts` dosyası ile doğrulanır.

---

### 2. `/admin.routes.ts`

Express yönlendirme dosyasıdır. Yetkilendirme ve CORS kontrolü içerir:

- `authenticate` + `authorizeRoles("admin")` middleware’leri ile koruma sağlar.
- Belirli admin panellerden gelen CORS isteklerini sadece izinli `origin`’lere açar.

---

### 3. `/admin.models.ts`

Sadece `type` ve `interface` tanımlarını içerir. Zod, Swagger ya da diğer katmanlar için tür desteği sağlar.

```ts
export type ModuleMeta = {
  name: string;
  icon: string;
  visibleInSidebar: boolean;
  ...
};
```

> Gerçek veritabanı modelleri `moduleMeta.model.ts` ve `moduleSettings.model.ts` dosyalarında yer alır.

---

### 4. `/moduleMeta.model.ts`

Veritabanında her modülün tanımlandığı yapıdır. Meta JSON dosyalarının MongoDB karşılığıdır.

- `name`, `icon`, `roles`, `routes`, `version`, `history`, `language` gibi alanları içerir.
- `generateMeta.ts` script’i çalıştığında buraya otomatik veri yazılır.
- Admin panel Swagger UI görünürlüğü ve Swagger üretimi bu model üzerinden yapılır.

> Tekil ve modül bazlı meta bilgilerini temsil eder.

---

### 5. `/moduleSettings.model.ts`

Frontend projeleri (örnek: `metahub`, `kuhlturm`) bazında modüllerin görünürlüğünü ve durumunu yönetir.

| Alan         | Açıklama                                                        |
|--------------|------------------------------------------------------------------|
| `project`    | Proje adı (`metahub`, `kuhlturm`, vs)                            |
| `module`     | Modül adı                                                       |
| `enabled`    | Modül aktif mi?                                                 |
| `visibleInSidebar` | Admin menüsünde görünür mü?                               |
| `label`      | Çok dilli etiket tanımı (`tr`, `en`, `de`)                      |
| `roles`      | Hangi roller bu modülü görebilir?                               |

> Bu model, admin panel konfigürasyonu içindir ve dinamik olarak güncellenebilir.

---

### 6. `/admin.validation.ts`

Zod ile yazılmış bir doğrulama (validation) dosyasıdır. Özellikle `PATCH` işlemlerinde `body` verisinin doğruluğunu garanti eder.

#### Şema:

```ts
export const updateModuleSchema = z.object({
  project: z.string(),
  enabled: z.boolean().optional(),
  visibleInSidebar: z.boolean().optional(),
  useAnalytics: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
  icon: z.string().optional(),
  label: z
    .object({
      tr: z.string(),
      en: z.string(),
      de: z.string(),
    })
    .optional(),
});
```

> Eğer `label` eksik ya da hatalı ise, controller’da otomatik silinir (`delete updates.label`).

---

### 7. `/index.ts`

Admin modülünü dış dünyaya **tek giriş noktası** olarak açar.

- `admin.routes.ts` içeriğini default router olarak export eder.
- `admin.controller.ts` içeriğini dışa aktarır.
- `admin.models.ts` içeriğini tipler için export eder.
- `moduleMeta.model.ts` ve `moduleSettings.model.ts` modellerini dışa aktarır.

#### Kullanım:
```ts
import adminModule from "./modules/admin";
app.use("/admin", adminModule);
```

---

## 🧠 Sistem Akışı (Özet)

```
Frontend Admin Panel ⟷ /admin endpoint ⟶
  |--> controller.ts ➝ veritabanı
                    ➝ moduleSettings.model.ts
                    ➝ moduleMeta.model.ts
```

- `generateMeta.ts`: Tüm modüller için JSON + DB güncellemesi yapar
- `metaValidator.ts`: `meta-configs` dosyalarını kontrol eder
- `admin` modülü: Bu yapıları admin panelden görüntüler, düzenler

---

## ✅ Bu Modül Ne İşe Yarar?

- 🔧 Modül yapılandırmalarını yönetir
- 🧩 Admin menüsü görünürlüğünü sağlar
- 🌐 Swagger UI üretimi için temel veriyi sağlar
- 🧪 Zod validasyon ile güvenli veri girişi sunar

---
