Aşağıdaki dosyayı repo’ya direkt ekleyebilirsin.

---

## `docs/modules/recipes-backend-review.md`

# 🍳 MetaHub · Recipes Modülü — **Backend Kod İncelemesi & İyileştirme Önerileri** (Rev. 2025-09-07)

**Kapsam:** Bu doküman; *types, mongoose schema/model, admin/public controller & routes, validation, AI generate flow, index & performans, güvenlik* başlıklarında mevcut backend kodunu detaylı inceler, riskleri ve iyileştirme/fix önerilerini içerir.
**Stack:** Express + Mongoose (multi-tenant), i18n (10 dil), Cloudinary + local uploads, slug & normalize yardımcıları.
**Tenant:** Tüm uçlar **`x-tenant: gzl`** (veya aktif tenant) ile çalışır — `getTenantModels(req)` üzerinden izolasyon.

> Not: i18n ve frontend standartlarıyla uyum için MetaHub rehberleriyle senkron ilerliyoruz. Çok dillilik için **TranslatedLabel** ve **SUPPORTED\_LOCALES** kullanımımız standartla uyumlu; tema/i18n genel ilkelerle çelişen nokta yok.&#x20;

---

## 1) Genel Mimari Değerlendirme

* **Multi-tenant izolasyon:** ✅ Controller’ların tamamı `req.tenant` filtresiyle çalışıyor, model erişimi `getTenantModels(req)` üzerinden yapılıyor (doğru).
* **i18n (10 dil):** ✅ `TranslatedLabel` yapısı ve `fillAllLocales` ile *eksik diller otomatik dolduruluyor*. Hem admin create/update hem de AI generate akışında normalize adımı var (tutarlı).
* **Veri modeli:** ✅ `Recipe` şeması geniş kapsamlı: `slug{10dil}`, `slugCanonical`, `title/description{10dil}`, `images[]`, `cuisines[]`, `tags[TranslatedLabel]`, `categories[ObjectId]`, süre/kalori, `ingredients/steps` (çok dilli).
* **Güvenlik:** ✅ Admin router `authenticate + authorizeRoles("admin","moderator")`.
  ⚠️ **Public AI generate** uç noktası `POST /recipes/generate` şu an *public*; DB’ye yazıyor. Rate-limit/captcha/role veya protected route önerilir (aşağıda).

---

## 2) Tipler & Şema Tutarlılığı

* `TranslatedLabel` tipi (recipes özelinde) **opsiyonel alanlı**:

  ```ts
  export type TranslatedLabel = { [key in SupportedLocale]?: string };
  ```

  Bu esnek yapı **backend’de `fillAllLocales`** ile **full 10 dile** tamamlanıyor; FE’de her zaman tam nesne döndüğü için **görsel katman sade** kalıyor (iyi).

  > MetaHub genelinde *opsiyonel vs zorunlu* iki şablon kullanıyorsun (Partial & Strict). Recipes modülü “Partial → normalize → Strict gibi davran” yaklaşımını izliyor; mantıklı.&#x20;

* `RecipeSchema` → `pre("validate")` içinde `slug` per-locale + `slugCanonical` set ediliyor.
  Controller’larda da `buildSlugAndCanonical()` çalışıyor; **duplicated fakat deterministik**. İleride DRY için utils’e taşıyıp tek kaynaktan çağırma önerilir (aşağıda “Refactor/DRY”).

---

## 3) İndeksler & Sorgu Örüntüleri (Performans)

**Mevcut:**

* Unique: `{ tenant, slugCanonical }`
* Filtreler: `{ tenant, order }`, `{ tenant, isActive, isPublished }`, `{ tenant, "categories" }`
* Locale bazlı: `{ tenant, slug.<lng> }` (tüm 10 dil için)

**Sorguların çoğu şunları yapıyor:**

* `q` search → `slug.*`, `title.*`, `description.*`, `tags.*`, `cuisines` üzerinde **regex**.
* public list → `isActive/isPublished` + tarih penceresi + `maxTime`.
* admin list → benzer; ayrıca category filtresi, order/sort.

**Önerilen ekstra indeksler:**

1. **Metin araması için** tek bir **text index**:

   ```ts
   // title/description/tags çok dilli alanları tek text indexte toplayın
   RecipeSchema.index({
     "title.tr": "text", "title.en": "text", "title.de": "text", "title.fr": "text",
     "description.tr": "text", "description.en": "text", "description.de": "text", "description.fr": "text",
     // tags.* metinsel arama için yeterli ise ekleyin:
     "tags.tr": "text", "tags.en": "text"
   }, { name: "recipe_text_search", default_language: "none" });
   ```

   > Not: MongoDB’de koleksiyon başına **1 adet** text index olabilir; ihtiyaç halinde dilleri kısaltın (en+tr+de gibi). Regex yerine text search ile **CPU yükü** azalır.

2. Sıklıkla kullanılan **published window** için bileşik:

   ```ts
   RecipeSchema.index({ tenant: 1, isActive: 1, isPublished: 1, effectiveFrom: 1, effectiveTo: 1 });
   ```

3. `totalMinutes` sorguları için:

   ```ts
   RecipeSchema.index({ tenant: 1, totalMinutes: 1 });
   ```

> Genel performans notu: liste uçlarında `.select()` + `.lean()` kullanımı yerinde; admin listede `lean({ virtuals:true, getters:true })` kullanımı da doğru. Filtreye uygun indexler eklendiğinde I/O ve CPU düşer.

---

## 4) Slug & Canonical Mantığı

* `buildSlugPerLocale()` / `pickCanonical()` hem model hem controller tarafında var.
* **PREFERRED\_CANONICAL\_ORDER** (en→tr→…) ile **deterministik canonical** seçimi doğru.
* `safeSlug()` numerik slug’ı engelliyor (`'123'` gibi), fallback ile düzgün.
* **İyileştirme:** Bu yardımcıları `backend/modules/recipes/utils/slug.ts` altına taşıyıp admin/public tarafında **tek kaynaktan** kullan (DRY).

---

## 5) Görsel İşleme

* `uploadTypeWrapper("recipe")` + `upload("recipe").array("images",10)` → **local path** + **Cloudinary publicId** birlikte tutuluyor.
* `processImageLocal()` → thumbnail/webp üretimi (feature-flag `shouldProcessImage()`).
* **Silme (update/delete)**: hem local dosya hem Cloudinary temizleniyor (iyi).
* **İyileştirme:**

  * `removedImages` string/array parse’ı doğru; *invalid* durumda **400 + i18n key** dönüyor (iyi).
  * Büyük koleksiyonlarda **orphan temizliği** için periyodik “garbage collect” job (opsiyonel).

---

## 6) Validasyon & Normalize Katmanı

* **express-validator** ile admin create/update/public list parametreleri korunuyor.
* **ingredients/steps**:

  * Admin’de **steps** `order >=1`, text çok dilli zorunlu.
  * Admin `normalizeSteps()` → 1..N’e diziyor (serve adımı eklemiyor).
  * Public/AI `normalizeSteps()` → *serve/plating cümlesi* yoksa **otomatik son adım ekliyor** + max 8 adım (kullanıcı dostu).
* **amount** hem string hem object kabul; normalize ile 10 dile yayılıyor (geri uyumlu).

> i18n alanları için `fillAllLocales` otomasyonu, MetaHub standardıyla birebir örtüşüyor (create/update sonrası tam 10 dil).&#x20;

---

## 7) Admin Controller Uçları

### `POST /recipes/admin`

* **Mutlaka** `title{≥1 dilde dolu}` ve `ingredients[]`, `steps[]` istiyor (doğru).
* Files → images\[] eklenir; slug/slugCanonical normalize edilir.
* **Dönüş:** `{ success, message, data }` (FE için ideal).

**Happy path (cURL)**

```bash
curl -X POST "$BASE/api/recipes/admin" \
  -H "x-tenant: gzl" -H "Authorization: Bearer $TOKEN" \
  -F 'title={"tr":"Mercimek Çorbası","en":"Lentil Soup"}' \
  -F 'description={"tr":"Lezzetli...","en":"Tasty..."}' \
  -F 'ingredients=[{"name":{"tr":"Kırmızı mercimek","en":"Red lentils"},"amount":"200 g"},{"name":{"tr":"Su","en":"Water"},"amount":"1 L"}]' \
  -F 'steps=[{"order":1,"text":{"tr":"Mercimeği yıka","en":"Rinse lentils"}},{"order":2,"text":{"tr":"Pişir","en":"Cook"}}]' \
  -F "images=@/path/img1.jpg" -F "images=@/path/img2.jpg"
```

**Edge case**

* `steps` boş/invalid → **422** `validation.stepsInvalid`
* `categories` invalid ObjectId → **422** `validation.categoryIdInvalid`

---

### `PUT /recipes/admin/:id`

* Tüm alanlar opsiyonel; gelenler normalize edilip setleniyor.
* `removedImages` ile seçili görseller siliniyor.

**Happy path**

```bash
curl -X PUT "$BASE/api/recipes/admin/$ID" \
  -H "x-tenant: gzl" -H "Authorization: Bearer $TOKEN" \
  -F 'tags=[{"tr":"vejetaryen","en":"vegetarian"}]' \
  -F 'removedImages=["/uploads/gzl/recipe-images/old.jpg"]' \
  -F "images=@/path/new.jpg"
```

**Edge case**

* `removedImages` parse edilemedi → **400** `validation.imagesRemoveInvalid`

---

### `GET /recipes/admin`

* Filtreler: `q, isActive, isPublished, category, limit(≤500)`
* `populate(categories: slug,name,order)` + minimal select (overfetch yok).

**Happy path**

```bash
curl -H "x-tenant: gzl" -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/recipes/admin?q=soup&isPublished=true&limit=50"
```

**Edge case**

* `limit > 500` → otomatik **500** ile sınırlanır (kontrol mevcut).

---

### `GET /recipes/admin/:id`

* `populate(categories)` + **lean** dönüş.

**Edge case**

* Kayıt yok → **404** `notFound`

---

### `DELETE /recipes/admin/:id`

* Local + Cloudinary temizlik → `200 deleted`.

**Edge case**

* Kayıt yok → **404** `notFound`

---

## 8) Public Controller Uçları

### `GET /recipes/public`

* Filtre: `q`, `tag`, `maxTime`, `limit(≤200)`
* Sadece aktif & yayın penceresi içi veriler (now window guard).

**Öneri:** Sık kullanılan kamu liste sayfalarında **cache-control**/CDN header eklenebilir.

### `GET /recipes/public/:slug`

* Önce `req.locale`, bulunamazsa tüm dillerde fallback `slug.*` ile arıyor (kullanıcı dostu).
* **Dönüş:** title/description/images/cuisines/tags/categories/servings… (tam detay)

**Edge case**

* Kayıt yok → **404** `notFound`

---

## 9) AI Generate & Save (Public)

`POST /recipes/public/generate`

* Girilen kriterlerden (cuisine, dietary flags, include/exclude, servings, maxMinutes, prompt) **tek bir tarif JSON** üretir.
* LLM’e **katı şema** veriliyor; `extractJsonSafe` ile parse; *forceJson* denemesi başarısızsa low-temp fallback var.
* Üretilen tarif `normalize*` katmanlarından geçip **DB’ye kayıt** edilir (order = tenant max + 1).

**Artılar**

* Kullanıcı deneyimi: 3–8 adım, son adım *serve* garantisi, etiket sertleştirme (`TAG_CANON`).
* `totalMinutes` cap = `maxMinutes` (varsa) — doğru UX.

**Riskler & Öneriler**

1. **Route güvenliği:** Bu uç **public** → kötüye kullanım mümkün.

   * En azından `rate-limit` (IP başı), `captcha` veya `x-api-key` ekleyin.
   * Alternatif: Ucu **admin router** altına taşıyın veya public’te **“isActive\:false”** kaydedip moderasyon bekletin.
2. **Kota/Maliyet:** LLM çağrıları maliyetli → **tenant başı günlük limit** ve **audit log** önerilir.
3. **İçerik güvenliği:** Basit kelime filtreleri (uygunsuz içerik) + prompt safelist/denylist eklenebilir.

**Basit rate-limit örneği (Express)**

```ts
// backend/modules/recipes/public.routes.ts (örnek)
import rateLimit from "express-rate-limit";

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 15 dk'da 20 istek
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/generate", aiLimiter, aiGeneratePublic);
```

---

## 10) DRY / Refactor Önerileri

**Sorun:** Bazı yardımcılar admin ve public controller’da yineleniyor:

* `safeSlug`, `buildSlugPerLocale`, `pickCanonical`, `normalizeIngredients`, `normalizeSteps`, `normalizeTags{Localized}`, `normalizeCuisines`…

**Öneri:** Tek bir util dizini:

```
backend/modules/recipes/utils/
  slug.ts        // safeSlug, buildSlugPerLocale, pickCanonical
  i18n.ts        // normalizeTranslatedLabel, fillAllLocales wrappers, fixCommonTypos, punctuateLabel
  content.ts     // normalizeIngredients, normalizeSteps, hasServeCue, hardenTags, addDerivedTagsIfMissing
  parse.ts       // parseIfJson, toStringArray
```

> Böylece **davranış drift’i** önlenir; test kapsamı artar, bakım maliyeti düşer.

---

## 11) Hata Mesajları & i18n Anahtarları

Controller’lar `t("created")`, `t("updated")`, `t("deleted")`, `t("notFound")`, `t("error.create_fail")`, `t("validation.*")` kullanıyor.
**Öneri:** `modules/recipes/i18n/{tr,en,...}.json` içinde bu anahtarların tam olduğundan emin ol (lint/test).

> i18n standardı gereği modül bazlı json ve `SUPPORTED_LOCALES` ile genişleyebilir yapı kullanılmalı.&#x20;

---

## 12) Güvenlik & Yetkilendirme

* **Admin router:** Doğru (auth + roles).
* **Public generate:** Mutlaka rate-limit/captcha/role önerildi (yukarıda).
* **Dosya yükleri:** Yalnızca image bekleniyorsa MIME/extension guard ekleyin (upload middleware seviyesinde).
* **Audit/Log:** `logger.withReq` ile bağlam yazılıyor (iyi). Generate akışında **prompt & criteriatext** log’unu *masked* yazın (PII riski).

---

## 13) Test Senaryoları (Happy Path + Edge)

> Postman için genel standartlar ve tenant header zorunluluğu MetaHub rehberleriyle uyumlu. Runner + cleanup ile iz bırakmadan koşulmalı.&#x20;

* **Create (admin):** 201, data.slugCanonical dolu, images sayısı = yüklenenler
  **Edge:** `steps=[]` → 422 `validation.stepsInvalid`
* **Update (admin):** 200 ve `removedImages` silinmiş, yeniler eklenmiş
  **Edge:** `removedImages` JSON parse fail → 400
* **List (admin):** 200, limit ≤500, q ile arama sonuç veriyor
  **Edge:** `category` invalid → 422
* **GetById (admin):** 200, categories populated
  **Edge:** olmayan id → 404
* **Delete (admin):** 200 + dosyalar temiz
  **Edge:** olmayan id → 404
* **Public list:** 200, publish window dışında öğe yok
  **Edge:** `maxTime < 0` → 422
* **Public detail:** 200, slug locale + fallback çalışıyor
  **Edge:** olmayan slug → 404
* **AI generate:** 201, steps 3–8 ve son adım *serve*
  **Edge:** boş kriter → 422 `recipes.error.promptInvalid`

---

## 14) Hızlı Fix/İyileştirme Patch’leri (Öneri)

### 14.1 Tek text index ile arama hızlandırma

```ts
// backend/modules/recipes/models.ts (RecipeSchema tanımından sonra)
RecipeSchema.index({
  "title.tr": "text", "title.en": "text", "title.de": "text", "title.fr": "text",
  "description.tr": "text", "description.en": "text", "description.de": "text", "description.fr": "text",
  "tags.tr": "text", "tags.en": "text"
}, { name: "recipe_text_search", default_language: "none" });
```

### 14.2 Public generate’i koruma (rate-limit)

```ts
// backend/modules/recipes/public.routes.ts
import rateLimit from "express-rate-limit";
const aiLimiter = rateLimit({ windowMs: 15*60*1000, max: 20 });
router.post("/generate", aiLimiter, aiGeneratePublic);
```

### 14.3 Utils refactor (DRY)

```ts
// örn. backend/modules/recipes/utils/slug.ts
export { safeSlug, buildSlugPerLocale, pickCanonical } from "../admin.controller"; // ilk adımda re-export
// sonra admin/public.controller importlarını buraya taşı
```

---

## 15) Kalite Kontrol Checklist (Recipes)

* [x] **Tenant izolasyonu** (her sorguda `tenant`)
* [x] **Index’ler** (tenant + business key + arama alanları) — *text index ekleyin*
* [x] **400/404/409/422** hata mesajları i18n key’lerle
* [x] **Validasyon** (ObjectId, tarih aralığı, süre ≥0; steps/ingredients şeması)
* [x] **Liste** uçlarında sayfalama + minimal select + lean
* [x] **Populate** minimal alan — `categories: "slug name order"`
* [x] **Görsel işleme** (thumb/webp), silmede local+cloud temizliği
* [x] **Log/Audit** (request context yazılıyor)
* [ ] **Public generate güvenliği** (rate-limit/captcha) **→ eklenecek**
* [ ] **DRY utils** (slug/i18n/normalize) **→ taşınacak**

---

## 16) Sonuç & Sonraki Adımlar (FE’ye Geçişten Önce)

1. **Public generate** uç noktasına en az **rate-limit** ekleyelim (opsiyon: RBAC/captcha).
2. **Text index** ile `q` ve `tag` aramalarını hızlandıralım.
3. Slug/i18n/normalize yardımcılarını **utils/** altında tek kaynağa taşıyıp *admin/public* controller’ları ondan kullandıralım.
4. i18n anahtarlarının modül json’larında **tam** olduğundan emin olalım.
5. (Opsiyon) Public list/detail için **cache-control** başlıkları.

> Bu 5 adım bittiğinde frontend’e güvenle geçebiliriz: RTK slice’lar, public list/detail sayfaları, admin CRUD ekranları. (FE tarafı, MetaHub’ın slice ve i18n rehberlerine aynı şekilde uyacak.)&#x20;

---

**Ek:** Tema/i18n/Redux standartlarıyla (çok dilli alanların normalize edilmesi, modül-bazlı i18n index yapısı, slice prensipleri) recipes modülü tamamen uyumlu ilerliyor; FE’de slice yazarken `apiCall` yardımcılarına ve “res vs res.data” standardına dikkat edeceğiz.

---
