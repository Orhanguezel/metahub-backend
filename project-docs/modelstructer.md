# 🌐 Multilingual Architecture Guide for Metahub

## 🎯 Purpose
This document defines a consistent multilingual content and system-language strategy for the Metahub project. It ensures scalable, maintainable and developer-friendly handling of internationalization across all modules.

---

## ✅ Language Field Usage

| Model Type                         | `language` field | Multilingual Fields (e.g. `label`, `description`) |
|----------------------------------|------------------|--------------------------------------------------|
| **System/User-specific models**   | ✅ Yes            | ❌ No (single-language only)                      |
| **Content/Publishable models**    | ❌ No             | ✅ Yes (per-field multilingual values)            |

### 🧍 User/System-related Models
- Examples: `User`, `Task`, `Notification`, `Settings`
- Purpose of `language`: UI language preference (stored per user)
- Fields like `name`, `bio`, `message`, `reason` are **not multilingual**

### 📝 Content/Publishable Models
- Examples: `Blog`, `Product`, `Service`, `FAQ`, `Gallery`, `Library`
- Instead of a `language` field, fields like `title`, `content`, `description` are structured as:

```ts
label: {
  tr: string;
  en: string;
  de: string;
},
description: {
  tr: string;
  en: string;
  de: string;
},
```

- Slugs are still stored per document (one per content set)
- This ensures that all languages can be managed in a single document

---

## 🧱 Example: Blog Schema
```ts
const blogSchema = new Schema({
  label: {
    tr: { type: String, required: true },
    en: { type: String, required: true },
    de: { type: String, required: true }
  },
  content: {
    tr: String,
    en: String,
    de: String
  },
  slug: String,
  ...
});
```

## ✍️ Content Editors
Content editors only fill one document for all supported languages.
They are **not required** to repeat module-level settings or toggle flags for each language.

## ⚠️ Important Notes
- Never duplicate documents per language (no `1 blog per language` pattern)
- All language keys (`tr`, `en`, `de`) must be filled when `required`
- System-level forms (like contact, feedback, login) can display multilingual UI but data stays **monolingual**

---

## 📘 TODOs & Follow-up
- [ ] Refactor existing content models to remove `language` field and switch to multilingual fields
- [ ] Update all create/edit forms in admin panel
- [ ] Apply validations for missing language fields
- [ ] Update seed scripts and migration tools accordingly

---

Maintainer: **Metahub Dev Team**
Updated: April 2025

