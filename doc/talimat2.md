---

# 🛠️ **MetaHub Modül Güncelleme Talimatı** (Multilang + Tenant + Logger Standard)

Bu doküman; her bir backend modülünü **çok dilli**, **tenant-aware**, **log analiz uyumlu** ve **future-proof** hale getirmek için standart adımları tanımlar.

---

## 🎯 Hedefler

✅ Çok dilli alanlar `TranslatedLabel` tipiyle tanımlanmalı
✅ `getTenantModels(req)` ile tenant'a özel model çekilmeli
✅ `translate()` + `getLogLocale()` kullanılarak tenant'a özel mesaj verilmeli
✅ Logger sistemine `tenant`, `event`, `module`, `status` alanları yazılmalı
✅ i18n yapısı `i18n/index.ts` + JSON dosyaları ile modül içinde tanımlanmalı
✅ Hardcoded dil kullanımı (ör: `name.en`) kesinlikle yasaktır!

---

## 🧱 1. **Tip Tanımı (`types/index.ts`)**

### ✔️ Çok dilli alanlar `TranslatedLabel` tipiyle tanımlanır:

```ts
import type { SupportedLocale, TranslatedLabel } from "@/types/common";

export interface IExampleModule {
  name: TranslatedLabel;
  description?: TranslatedLabel;
  ...
}
```

---

## 🧬 2. **Mongoose Model (`model.ts`)**

### ✔️ Otomatik çok dilli alan şeması:

```ts
import { SUPPORTED_LOCALES } from "@/types/common";
import type { SupportedLocale } from "@/types/common";

const translatedFieldSchema = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<SupportedLocale, any>);

const ExampleSchema = new Schema({
  name: translatedFieldSchema,
  description: translatedFieldSchema,
  ...
});
```

---

## 🌐 3. **i18n Dosyaları (`i18n/`)**

### ✔️ `i18n/index.ts` dosyası (her modülde zorunlu):

```ts
import tr from "./tr.json";
import en from "./en.json";
import de from "./de.json";
import pl from "./pl.json";
import fr from "./fr.json";
import es from "./es.json";
import type { SupportedLocale } from "@/types/common";

const translations: Record<SupportedLocale, any> = { tr, en, de, pl, fr, es };

export default translations;
```

### ✔️ JSON dosyaları: `tr.json`, `en.json` vs.

Anahtar yapısı:

```json
{
  "create": {
    "success": "Başarıyla oluşturuldu.",
    "missingField": "En az bir dilde ad girilmelidir."
  },
  "update": {
    "success": "Güncelleme başarılı."
  }
}
```

---

## 🧠 4. **Yardımcı Fonksiyonlar Kullanımı**

### ✔️ create içinde:

```ts
const name = fillAllLocales(req.body.name);
```

### ✔️ update içinde:

```ts
if (updates.name) {
  updates.name = mergeLocalesForUpdate(existing.name, updates.name);
}
```

### ✔️ JSON dönüşte:

```ts
const name = parseMultilangField(item.name, req.locale || "en");
```

---

## ⚙️ 5. **Controller Standardı**

### ✔️ Tenant-aware model çekme:

```ts
const { ExampleModel } = getTenantModels(req);
```

### ✔️ Locale-aware çeviri ve log:

```ts
const t = (key: string, params?: Record<string, any>) =>
  translate(key, req.locale || getLogLocale(), translations, params);
```

### ✔️ Log kullanımı:

```ts
logger.info(t("create.success"), {
  ...getRequestContext(req),
  module: "example",
  event: "example.create",
  status: "success",
});
```

---

## ✅ 6. **Validasyon Standardı (`validation.ts`)**

### ✔️ create için:

```ts
export const validateCreateExample = [
  validateMultilangField("name"),
  validateRequest,
];
```

### ✔️ update için:

```ts
export const validateUpdateExample = [
  body("name")
    .optional()
    .custom((value) => {
      const obj = typeof value === "string" ? JSON.parse(value) : value;
      if (obj && typeof obj !== "object") throw new Error("name must be object");
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

## 🚫 7. **Hardcoded Dil Kullanımı YASAK!**

```ts
// ❌ Hatalı:
const slug = name.en.toLowerCase();

// ✅ Doğru:
const firstValidName = SUPPORTED_LOCALES.map((l) => name?.[l])
  .find((val) => typeof val === "string" && val.trim());
```

---

## 🔄 8. **Router Yapısı**

Her modülün `router.ts` dosyası aşağıdaki yapıyı izlemelidir:

```ts
router.post("/", validateCreateExample, createExample);
router.put("/:id", validateUpdateExample, updateExample);
...
```

---

## 🧩 9. **Yeni Modül İçin Klasör Yapısı**

```
/modules/example/
  ├── controller.ts
  ├── model.ts
  ├── types/index.ts
  ├── i18n/
  │   ├── tr.json
  │   ├── en.json
  │   └── index.ts
  ├── validation.ts
  ├── router.ts
```

---

## 🧪 10. **Test ve Denetim**

| Kontrol                       | Açıklama                                     |
| ----------------------------- | -------------------------------------------- |
| ✅ Çoklu dil `TranslatedLabel` | Model + types tutarlı mı?                    |
| ✅ i18n dosyaları              | `tr.json`, `index.ts` var mı?                |
| ✅ Tenant modeli kullanımı     | `getTenantModels(req)` kullanılmış mı?       |
| ✅ Logger kullanımı            | `module`, `event`, `status` alanları var mı? |
| ✅ Hardcoded dil var mı?       | `name.en` gibi sabit dil erişimi yok mu?     |
| ✅ JSON dönüşler               | `parseMultilangField()` ile sade veri mi?    |

---

## 🎁 BONUS: `getTenantModels`’e model eklemek

Her modülde:

```ts
// getTenantModels.ts
export const getTenantModels = (req: Request) => {
  const ExampleModel = req.getModel("Example", ExampleSchema);
  ...
  return { ExampleModel, ... };
};
```
