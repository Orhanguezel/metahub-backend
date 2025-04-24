
---

# 🧠 Meta Sistemi – MetaHub Backend

Bu doküman, **MetaHub Backend** projesindeki `meta-configs/` yapısının nasıl çalıştığını ve `meta.json` dosyalarının sistemdeki rolünü açıklar.

---

## 🎯 Amaç

Meta sistemi, her modülün teknik özelliklerini tanımlamak ve bu bilgileri:
- Swagger dokümantasyonu üretmek,
- Admin panelde modül görünürlüğünü kontrol etmek,
- Versiyonlama ve ayarlar için merkezi yapı sağlamak amacıyla kullanır.

---

## 🗂️ Dosya Yapısı

Her proje için bir `meta-config` dizini vardır:

```
meta-configs/
└── metahub/
    ├── blog.meta.json
    ├── cart.meta.json
    └── ...
```

Her `.meta.json` dosyası bir modülü temsil eder.

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
      "body": { "$ref": "#/definitions/BlogCreate" }
    }
  ]
}
```

### Alanlar Açıklaması

| Alan             | Açıklama                                                             |
|------------------|----------------------------------------------------------------------|
| `name`           | Modül adı (zorunlu)                                                  |
| `icon`           | Admin panel ikon adı (örnek: `"box"`)                               |
| `visibleInSidebar` | Admin menüde görünürlük                                            |
| `roles`          | Bu modüle erişebilecek roller (örnek: `["admin"]`)                  |
| `enabled`        | Aktif/pasif durumu                                                  |
| `useAnalytics`   | Route bazlı analitik takibi gerekiyorsa `true`                      |
| `language`       | Varsayılan dil (çok dilli içeriklerde `"en"`, `"de"`, `"tr"`)       |
| `routes`         | Swagger için endpoint tanımları (`method`, `path`, `summary`, `body`)|

---

## 🔄 Meta Oluşturma

Tüm modüller için meta dosyası otomatik oluşturulabilir:

```bash
bun run src/scripts/generateMeta.ts
```

Bu script:
- `routes.ts` dosyalarından path ve method bilgilerini çıkarır
- `meta-configs/` altına yazma işlemi yapar
- `ModuleMetaModel` üzerinden veritabanına kaydeder
- `.env.*` dosyalarına göre `enabled` alanını belirler (`getEnvProfiles()` ile)

---

## 🧪 Meta Doğrulama

```bash
bun run src/scripts/metaValidator.ts
```

Bu araç şunları kontrol eder:
- JSON yapısı geçerli mi?
- Zorunlu alanlar (`name`, `icon`, `routes`) eksik mi?
- İlgili modül klasörü var mı?
- `.env.*` dosyasında modül aktif mi?

---

## 💾 Meta'nın Veritabanı ile İlişkisi

### `ModuleMetaModel` (meta tanımı)
MongoDB'de her modül için meta bilgileri saklanır. Admin panel bunu kullanır.

### `ModuleSetting` (proje-bazlı ayar)
Her frontend projesi (`.env.metahub`, `.env.kuhlturm` vb.) için ayrı ayarlar tutulur.

```ts
{
  project: "metahub",
  module: "blog",
  enabled: true,
  visibleInSidebar: true
}
```

---

## 🔗 Swagger ile Entegrasyon

Meta dosyaları üzerinden otomatik Swagger dokümantasyonu üretilir:

```ts
generateSwaggerSpecFromMeta()
```

- `routes[].body` alanı varsa Swagger `requestBody` oluşturulur.
- Swagger UI: `/api-docs`
- Swagger JSON: `/swagger.json`

---

## 🚀 Geliştirmeye Açık Noktalar

- [ ] `version` alanı ile modül sürüm kontrolü
- [ ] `formType`: `json` vs `form-data` belirleme
- [ ] `fields` alanı ile dinamik form yapıları
- [ ] Swagger için özel `response` örnekleri
- [ ] Admin panel üzerinden meta güncelleme UI

---
