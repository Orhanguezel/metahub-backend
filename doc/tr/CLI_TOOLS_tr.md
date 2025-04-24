

# 🛠️ CLI Araçları – MetaHub Backend

Bu doküman, MetaHub projesinde kullanılan komut satırı araçlarını ve bunların ne işe yaradığını açıklar. Tüm araçlar `bun` komutu ile çalıştırılır.

---

## 📦 `create:module` – Yeni Modül Oluşturma

Yeni bir backend modülü oluşturmak için kullanılır. Modüler yapı sayesinde projede tutarlılık ve sürdürülebilirlik sağlar.

### 📌 Kullanım

```bash
bun run scripts/createModule.ts <modul-adi>
```

### 📁 Oluşturulan Yapı

Aşağıdaki dosya yapısı otomatik olarak oluşturulur:

```
src/modules/<modul-adi>/
├── <modul>.controller.ts          # CRUD işlemleri
├── <modul>.models.ts              # Mongoose şeması
├── <modul>.routes.ts              # Express router tanımları
├── <modul>.validation.ts          # Zod validasyon şemaları
├── index.ts                       # Modül dışa aktarımı
└── __tests__/
    └── <modul>.controller.spec.ts # Jest test şablonu
```

Ek olarak aşağıdaki meta dosyası oluşturulur:

```
meta-configs/metahub/<modul-adi>.meta.json
```

> `.env.metahub` içine **otomatik kayıt yapılmaz**. `ENABLED_MODULES` listesi manuel güncellenmelidir.

---

## ✅ `metaValidator.ts` – Meta Doğrulama Aracı

Tüm `meta-configs/metahub/*.meta.json` dosyalarını kontrol eder.

### 📌 Komut

```bash
bun run src/scripts/metaValidator.ts
```

### 🔍 Kontroller

- JSON geçerliliği
- Gerekli alanlar: `name`, `icon`, `routes`
- İlgili modül klasörü mevcut mu?
- `.env.*` dosyalarında modül aktif mi?

> Çoklu frontend projeleri için kritik bir güvenlik ve tutarlılık katmanıdır.

---

## 📘 `generateSwaggerSpec.ts` – Swagger Döküm Üretimi

Tüm aktif modüllerin `meta.json` dosyalarından otomatik Swagger JSON oluşturur.

### 📌 Fonksiyon

```ts
await generateSwaggerSpecFromMeta()
```

> Swagger UI'de kullanılmak üzere `/swagger.json` dökümanı üretir.

---

## 🧩 `setupSwagger.ts` – Swagger UI Entegrasyonu

Express uygulamasına Swagger UI bağlar.

### 🚀 Özellikler

- `/swagger.json` ➤ Otomatik oluşturulan Swagger dökümanı
- `/api-docs` ➤ Swagger arayüzü
- `generateSwaggerSpecFromMeta()` ile içerik üretimi

### 🌐 Ortam Değişkenleri

| Değişken      | Açıklama                          |
|---------------|-----------------------------------|
| `APP_ENV`     | `.env.*` dosyasını seçer          |
| `PORT`        | Uygulama portu                    |
| `HOST`        | Swagger UI temel URL'si           |
| `SWAGGER_BASE_URL` | Swagger `server.url` tanımı |

---

## 📌 Geliştirme Fırsatları

- `delete:module` → Modülü ve meta dosyasını silme
- `sync:admin` → Meta'dan DB'ye ayarları güncelleme
- `generate:form` → Form yapılarını otomatik üretme
- `create:module --formdata` gibi flag'lerle contentType seçimi

---