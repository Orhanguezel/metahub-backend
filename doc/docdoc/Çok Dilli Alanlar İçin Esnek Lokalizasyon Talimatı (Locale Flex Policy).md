
---

# 🌐 Çok Dilli Alanlar İçin **Esnek Lokalizasyon Talimatı** (Locale Flex Policy)

Bu standart; `Articles`, `Categories`, `Services`, `Sections`, `Blogs`, `FAQs` gibi tüm modüllerde **çok dilli metin alanları** (`title`, `name`, `label`, `description`, `content`, vs.) için **minimal veri girişini destekleyen, otomatik tamamlanan ve güncellemeye duyarlı** bir yapıyı tanımlar.

---

## 🎯 Amaç

✅ **Kullanıcı yalnızca bir dilde içerik girebilsin**
✅ Eksik diller backend tarafında otomatik tamamlanabilsin
✅ Güncellemelerde sadece gelen diller değiştirilsin
✅ Validasyon en az **bir dilin dolu olması** şartını kontrol etsin
✅ Tüm yapı `logger`, `i18n`, `translate`, `validation`, `merge` sistemlerine entegre olsun

---

## 🧠 Temel Mantık

### ✅ Create Aşaması

* Kullanıcı sadece bir dilde içerik gönderir
* Diğer tüm diller otomatik olarak ilk geçerli değerle doldurulur
* `fillAllLocales()` fonksiyonu kullanılır

```json
{
  "name": { "tr": "Kategori" }
}
```

Backend →

```ts
const name = fillAllLocales(req.body.name);
// -> { tr: "Kategori", en: "Kategori", de: "Kategori", ... }
```

---

### ✏️ Update Aşaması

* Kullanıcı sadece güncellemek istediği dilleri gönderir
* Diğer diller önceki içerikten korunur
* `mergeLocalesForUpdate()` fonksiyonu kullanılır

```ts
const name = mergeLocalesForUpdate(existing.name, req.body.name);
```

---

## 🧱 Kullanılacak Yardımcı Fonksiyonlar

### ✅ `fillAllLocales(input)`

Her eksik dili, girilen ilk geçerli değer ile tamamlar.

```ts
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";

export function fillAllLocales(input: any): Record<SupportedLocale, string> {
  if (typeof input === "string") {
    const val = input.trim();
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = val;
      return acc;
    }, {} as Record<SupportedLocale, string>);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return SUPPORTED_LOCALES.reduce((acc, lang) => {
      acc[lang] = "";
      return acc;
    }, {} as Record<SupportedLocale, string>);
  }

  const firstValid = SUPPORTED_LOCALES.map((l) => input[l])
    .find((v) => typeof v === "string" && v.trim());

  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    const val = input[lang];
    acc[lang] =
      typeof val === "string" && val.trim()
        ? val.trim()
        : (firstValid || "");
    return acc;
  }, {} as Record<SupportedLocale, string>);
}
```

---

### ✅ `validateMultilangField(field: string)`

Sadece bir dil zorunludur. Diğer diller opsiyoneldir.

```ts
import { body } from "express-validator";
import { SUPPORTED_LOCALES } from "@/types/common";

export const validateMultilangField = (field: string) =>
  body(field).custom((value) => {
    const obj = typeof value === "string" ? JSON.parse(value) : value;
    if (!obj || typeof obj !== "object")
      throw new Error(`${field} must be an object with at least one language.`);

    const hasOne = SUPPORTED_LOCALES.some(
      (lang) => obj[lang] && obj[lang].trim()
    );
    if (!hasOne)
      throw new Error(`At least one language must be provided in ${field}.`);

    return true;
  });
```

---

### ✅ `mergeLocalesForUpdate(current, incoming)`

Sadece gelen dilleri değiştir, diğerlerini koru.

```ts
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import { fillAllLocales } from "./fillAllLocales";

export function mergeLocalesForUpdate(
  current: Record<SupportedLocale, string>,
  incoming: any
): Record<SupportedLocale, string> {
  const filledIncoming = fillAllLocales(incoming);
  return SUPPORTED_LOCALES.reduce((acc, lang) => {
    acc[lang] =
      typeof filledIncoming[lang] === "string" && filledIncoming[lang].trim()
        ? filledIncoming[lang]
        : current[lang] || "";
    return acc;
  }, {} as Record<SupportedLocale, string>);
}
```

---

## ✅ Validasyon Örnekleri

### 📥 `Create` Validator

```ts
import { validateMultilangField } from "@/core/utils/i18n/validationUtils";

export const validateCreateCategory = [
  validateMultilangField("name"),
  validateRequest,
];
```

### ✏️ `Update` Validator

```ts
export const validateUpdateCategory = [
  body("name")
    .optional()
    .custom((value) => {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      if (obj && typeof obj !== "object") throw new Error(`name must be object`);
      for (const [lang, val] of Object.entries(obj || {})) {
        if (val && typeof val !== "string") {
          throw new Error(`name.${lang} must be string`);
        }
      }
      return true;
    }),
  validateRequest,
];
```

---

## 🧱 Mongoose Model Örneği

```ts
import { SUPPORTED_LOCALES } from "@/types/common";

const nameFields = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<SupportedLocale, any>);

const ArticleCategorySchema = new Schema({
  name: nameFields,
  ...
});
```

---

## 🎁 Bu Yapıyı Kullanan Modüller

* `Articles` → `title`, `summary`, `content`
* `ArticlesCategory` → `name`
* `Services` → `label`, `description`
* `Sections`, `FAQs`, `Blogs`, `Coupons`, `Notifications`…

---