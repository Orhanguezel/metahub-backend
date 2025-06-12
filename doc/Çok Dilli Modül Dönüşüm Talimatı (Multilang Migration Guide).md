
---

# 🧩 Çok Dilli Modül Dönüşüm Talimatı (Multilang Migration Guide)

Bu döküman, `section` ve `articles` modüllerini referans alarak, tüm modüllerin çok dilli yapıya geçişi için **tekrar edilebilir ve standartlaştırılmış dönüşüm adımlarını** kapsar.

---

## 1. 🧱 Model Tipi ve Mongoose Şeması

### 🎯 Hedef:

Çok dilli alanlar `TranslatedLabel` tipi ile tanımlanmalı ve `SUPPORTED_LOCALES` üzerinden schema otomatik üretilmelidir.

### 📦 `types/index.ts`:

```ts
import type { SupportedLocale } from "@/types/common";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface IModulename {
  label: TranslatedLabel;
  description?: TranslatedLabel;
  ...
}
```

### 🧬 `model.ts`:

```ts
import { SUPPORTED_LOCALES } from "@/types/common";

const translatedFieldSchema = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<string, any>);

const ModSchema = new Schema<IModulename>({
  label: translatedFieldSchema,
  description: translatedFieldSchema,
  ...
});
```

---

## 2. 🧠 Yardımcı Fonksiyonlar (Ortak Kullanım)

| Fonksiyon                                       | Amaç                               |
| ----------------------------------------------- | ---------------------------------- |
| `fillAllLocales(value)`                         | Eksik dilleri otomatik doldurur    |
| `parseMultilangField(obj, locale)`              | Tek dilde veri döndürür            |
| `getLogLocale()`                                | Logger için fallback dil           |
| `translate(key, locale, translations, params?)` | Çok dilli hata/info mesajları      |
| `setLocale(req, res, next)`                     | `req.locale` tanımlar (middleware) |

🧩 Bu dosyalar:
`/src/core/utils/i18n/*.ts` içinde standart olarak tutulmalıdır.

---

## 3. 🎯 Controller Yapısı

### ➕ CREATE:

```ts
label = fillAllLocales(label);
description = description ? fillAllLocales(description) : undefined;

if (!SUPPORTED_LOCALES.every((l) => label[l] && label[l].trim())) {
  logger.warn(t("modulename.create.labelMissing"), getRequestContext(req));
  return res.status(400).json({ success: false, message: t("modulename.create.labelMissing") });
}
```

### ✏️ UPDATE:

```ts
if (updates.label) {
  updates.label = { ...existing.label, ...fillAllLocales(updates.label) };
}
if (updates.description) {
  updates.description = { ...existing.description, ...fillAllLocales(updates.description) };
}
```

---

## 4. ✅ Validation

```ts
const isValidTranslatedLabel = (value: any): boolean => {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    return Object.values(value).some(
      (v) => typeof v === "string" && v.trim().length > 0
    );
  }
  return false;
};

export const validateModulenameCreate = [
  body("label")
    .custom((value, { req }) => {
      const isValid = isValidTranslatedLabel(value);
      if (!isValid) {
        logger.warn("modulename.validation.invalidLabel", {
          path: req.path,
          method: req.method,
          ip: req.ip,
          body: value,
        });
      }
      return isValid;
    })
    .withMessage("modulename.invalidLabel"),
];
```

---

## 5. 🌍 i18n Kullanımı

```ts
const t = (key: string, params?: Record<string, any>) =>
  translate(key, req.locale || getLogLocale(), translations, params);
```

---

## 6. 🌐 API Response Formatı

### GET işlemlerinde:

```ts
const title = parseMultilangField(article.title, req.locale || "tr");
```

### JSON Response:

```json
{
  "title": "Sürdürülebilirlik Politikası"
}
```

---

## 7. 🚨 Logger Kullanımı (standart format)

```ts
logger.info(t("modulename.create.success", { name: label[locale] }), {
  ...getRequestContext(req),
  event: "modulename.create",
  module: "modulename",
  status: "success",
});
```

---

## 8. 🔒 Bonus: Zorunlu Dil Doğrulama (Schema bazlı)

Eğer kesinlikle tüm dillerin dolu olması isteniyorsa:

```ts
label: {
  type: Map,
  of: String,
  required: true,
  validate: {
    validator: (obj) => SUPPORTED_LOCALES.every((l) => obj.has(l) && obj.get(l)?.trim()),
    message: "All supported locales must be provided in label.",
  }
}
```

---

## 9. ⚠️ Yasak: Hardcoded dil kullanımı

**Aşağıdaki gibi slug veya diğer alanlarda sabit dil seçmek yasaktır:**

```ts
// ❌ YASAK
this.slug = this.title.en.toLowerCase();
```

### ✅ Doğrusu:

```ts
import { SUPPORTED_LOCALES } from "@/types/common";

ArticlesSchema.pre("validate", function (next) {
  if (!this.slug) {
    const firstAvailableTitle =
      SUPPORTED_LOCALES.map((lang) => this.title?.[lang])
        .find((val) => typeof val === "string" && val.trim());
    if (firstAvailableTitle) {
      this.slug = firstAvailableTitle
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
  }
  next();
});
```

---

## 🎁 Yeni Modül Dönüşüm Şablonu

1. `types/index.ts` → `TranslatedLabel` ile tipleri tanımla
2. `model.ts` → `translatedFieldSchema` ile schema oluştur
3. `controller.ts` → `fillAllLocales` + `SUPPORTED_LOCALES.every(...)` kontrolü uygula
4. `validation.ts` → `isValidTranslatedLabel()` kullan
5. `router.ts` → `validateRequest` ile beraber controller'a bağla
6. `i18n` → `"modulename.create.success"` vs. anahtarları `tr.json`, `en.json`, `de.json` dosyalarına ekle
7. `parseMultilangField()` → frontend’e sade içerik döndürmek için kullan
8. `slug` üretimini dil-agnostik yap, hardcoded dil kullanma
9. `logger` yapısını `getRequestContext(req)` ile entegre et

---