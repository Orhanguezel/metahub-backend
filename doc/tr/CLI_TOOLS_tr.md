
---

# 🛠️ CLI Araçları – MetaHub Backend

Bu doküman, MetaHub projesinde kullanılan komut satırı araçlarını ve bunların ne işe yaradığını açıklar. Tüm araçlar `bun` komutu ile çalıştırılır.

---

## 📦 `create:module` – Yeni Modül Oluşturma

Yeni bir backend modülü oluşturmak için kullanılır. Modüler yapı sayesinde projede tutarlılık ve sürdürülebilirlik sağlar.

### 📌 Kullanım

```bash
bun run scripts/createModule.ts <modul-adi>
```

### 📁 Otomatik Oluşturulan Yapı

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

Ek olarak şu dosya oluşturulur:

```
meta-configs/metahub/<modul-adi>.meta.json
```

> `.env.metahub` içindeki `ENABLED_MODULES` listesine **otomatik ekleme yapılmaz**. Bu liste manuel güncellenmelidir.

---

## ✅ `metaValidator.ts` – Meta Doğrulama Aracı

Tüm `meta-configs/metahub/*.meta.json` dosyalarının geçerliliğini kontrol eder.

### 📌 Komut

```bash
bun run src/scripts/metaValidator.ts
```

### 🔍 Kontrol Edilenler

- JSON formatı ve geçerliliği
- Gerekli alanların (örneğin: `name`, `icon`, `routes`) varlığı
- İlgili modül klasörünün gerçekten var olup olmadığı
- `.env.*` dosyalarında modülün etkinleştirilmiş olması

---

## 🔄 `generate:meta` – Modül Dosyalarından Meta Üretimi

Mevcut `routes`, `controller`, `validation` dosyalarını tarayarak:

- Güncel `.meta.json` dosyasını üretir/günceller
- `ModuleMeta` ve `ModuleSetting` koleksiyonlarına kayıt yapar
- Orphan (karşılığı olmayan) meta dosyalarını ve DB kayıtlarını siler

### 📌 Kullanım

```bash
bun run generate:meta
```

### 🧠 Özellikler

- Yeni veya silinen modülleri algılar
- `version`, `lastUpdatedAt`, `updatedBy` alanlarını otomatik günceller
- `authenticate` içeren rotaları `auth: true` olarak işaretler
- `Zod` şemalarından JSON schema üretimi (`body`) sağlar

---

## 📘 `generateSwaggerSpec.ts` – Swagger JSON Üretimi

Aktif modüllerin meta dosyalarına göre Swagger tanımı oluşturur.

### 📌 Kullanım

```ts
await generateSwaggerSpecFromMeta()
```

> Swagger UI tarafından kullanılan `/swagger.json` dökümanını oluşturur.

---

## 🧩 `setupSwagger.ts` – Swagger UI Entegrasyonu

Express uygulamasına Swagger UI arayüzünü dahil eder.

### 🚀 Sağladığı Özellikler

- `/swagger.json` → Otomatik oluşturulan Swagger verisi
- `/api-docs` → Swagger kullanıcı arayüzü
- İçerik: `generateSwaggerSpecFromMeta()` çıktısına dayanır

### 🌐 Ortam Değişkenleri

| Değişken              | Açıklama                          |
|-----------------------|-----------------------------------|
| `APP_ENV`             | Aktif `.env.*` dosyasını seçer    |
| `PORT`                | Uygulamanın portu                 |
| `HOST`                | Swagger’ın erişim adresi          |
| `SWAGGER_BASE_URL`    | Swagger `server.url` değeri       |

---

## ⚠️ `watchMeta.ts` (Opsiyonel) – **Gerçek Zamanlı Takip (Durduruldu)**

> Gerçek zamanlı dosya izleme sistemi çok fazla yük ve log oluşturduğu için şu an **devre dışı**. Bunun yerine `generate:meta` sadece sunucu başlangıcında çalıştırılır.

---

## 📌 Gelecek Planları

- `delete:module` → Modül klasörünü, meta dosyasını ve DB kayıtlarını sil
- `sync:admin` → Meta’dan `ModuleSetting` bilgilerini eşitle
- `generate:form` → Admin arayüzü için form yapılarını otomatik üret
- `create:module --formdata` → `multipart/form-data` gibi özel içerik türü destekle

---
