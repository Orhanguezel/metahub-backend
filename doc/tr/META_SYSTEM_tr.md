
---

# 🧠 Meta Sistemi – MetaHub Backend

Bu doküman, **MetaHub Backend** projesindeki `meta-configs/` yapısının nasıl çalıştığını ve `meta.json` dosyalarının sistemdeki rolünü açıklar.

---

## 🎯 Amaç

Meta sistemi, her modülün teknik özelliklerini tanımlamak ve bu bilgileri:

- ✅ Swagger dokümantasyonu üretmek
- ✅ Admin panelde modül görünürlüğünü ve yetkilerini kontrol etmek
- ✅ Versiyonlama, güncelleme geçmişi ve proje-bazlı ayar yönetimi için kullanmak

amacıyla merkezi bir yapı sunar.

---

## 🗂️ Dosya Yapısı

Her proje için bir `meta-configs/<proje-adı>/` klasörü mevcuttur:

```
meta-configs/
└── metahub/
    ├── blog.meta.json
    ├── cart.meta.json
    └── ...
```

Her `.meta.json` dosyası bir backend modülünü temsil eder.

---

## 🧬 Meta Dosyası Yapısı

### Örnek: `blog.meta.json`

```json
{
  "name": "blog",
  "icon": "box",
  "visibleInSidebar": true,
  "roles": ["admin"],
  "enabled": true,
  "useAnalytics": false,
  "language": "en",
  "version": "1.2.4",
  "updatedBy": "orhan",
  "lastUpdatedAt": "2025-04-23T15:12:34.123Z",
  "history": [
    {
      "version": "1.2.4",
      "by": "orhan",
      "date": "2025-04-23T15:12:34.123Z",
      "note": "Meta auto-generated"
    }
  ],
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "auth": true,
      "summary": "Get all blogs"
    },
    {
      "method": "POST",
      "path": "/",
      "auth": true,
      "summary": "Create new blog",
      "body": {
        "$ref": "#/definitions/BlogCreate"
      }
    }
  ]
}
```

### Alan Açıklamaları

| Alan              | Açıklama                                                                 |
|-------------------|--------------------------------------------------------------------------|
| `name`            | Modül adı (zorunlu)                                                      |
| `icon`            | Admin panelde görüntülenecek ikon adı (örnek: `"box"`)                  |
| `visibleInSidebar`| Modülün sol menüde görünüp görünmeyeceği                                |
| `roles`           | Hangi rollerin bu modülü görebileceği (örnek: `["admin"]`)              |
| `enabled`         | Bu modül aktif mi (`true`/`false`)                                       |
| `useAnalytics`    | Route bazlı kullanım analitiği aktif mi                                  |
| `language`        | Varsayılan içerik dili (`"en"`, `"de"`, `"tr"`)                          |
| `version`         | Meta tanımının versiyonu (otomatik güncellenir)                          |
| `updatedBy`       | En son kim tarafından güncellendi                                        |
| `lastUpdatedAt`   | ISO formatında son güncelleme tarihi                                     |
| `history`         | Versiyon geçmişi (`version`, `by`, `date`, `note`)                      |
| `routes`          | Swagger endpoint bilgileri (`method`, `path`, `auth`, `summary`, `body`) |

---

## 🔄 Meta Dosyası Oluşturma

Tüm modüller için meta dosyası otomatik oluşturulabilir:

```bash
bun run generate:meta
```

### Bu komut:
- `routes.ts` dosyalarındaki rotaları tarar
- `meta-configs/metahub/<modul>.meta.json` dosyasını oluşturur veya günceller
- MongoDB'deki `ModuleMeta` ve `ModuleSetting` koleksiyonlarını günceller
- `.env.metahub` içindeki `ENABLED_MODULES` listesine göre `enabled` değerini belirler
- Silinmiş modüllerin karşılık gelen meta dosyasını ve veritabanı kayıtlarını **otomatik olarak siler**

---

## 🧪 Meta Doğrulama

```bash
bun run src/scripts/metaValidator.ts
```

Bu doğrulayıcı şunları kontrol eder:
- JSON yapısı ve şemaya uygunluk
- Gerekli alanlar: `name`, `icon`, `routes` var mı?
- İlgili modül klasörü fiziksel olarak var mı?
- Modül `.env.metahub` içinde etkin mi (`ENABLED_MODULES`)?

---

## 💾 Veritabanı Yapısı

### 🧱 `ModuleMetaModel`

Her modül için meta bilgileri (versiyon, route, dil vb.) burada saklanır.

### 🔧 `ModuleSetting`

Her frontend projesi için modül bazlı ayarları içerir:

```ts
{
  project: "metahub",
  module: "blog",
  enabled: true,
  visibleInSidebar: true
}
```

---

## 🔗 Swagger Entegrasyonu

Meta dosyalarından Swagger dokümantasyonu otomatik olarak üretilir:

```ts
generateSwaggerSpecFromMeta()
```

### Swagger UI

- Swagger UI: `http://localhost:<PORT>/api-docs`
- Swagger JSON: `http://localhost:<PORT>/swagger.json`

---

## 🚀 Gelecek Geliştirme Planları

- [x] Orphan meta temizliği (`.meta.json` + MongoDB silme)
- [x] Versiyon geçmişi takibi (`version`, `history`)
- [ ] `formType`: JSON vs `form-data` olarak belirtme
- [ ] `fields`: Admin panel için otomatik form üretimi
- [ ] `responses`: Swagger `response` örnekleri tanımlama
- [ ] Admin panel üzerinden meta düzenleme UI arayüzü

---
