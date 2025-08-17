Aşağıya backend’e göre **tam modül dökümantasyonunu** tek dosyada verdim. Direkt repo’ya ekleyebilirsin.

---

### `docs/modules/offers/README.md`

````md
# Offers Modülü — MetaHub (tenant: ensotek)

Bu doküman, **ensotek** tenant’ında çalışan **Offers** modülünün backend davranışını, veri modelini,
validasyonlarını, PDF/e-posta akışlarını ve API uçlarını özetler. Tüm örnek isteklerde **`x-tenant: ensotek`** gönderilir. :contentReference[oaicite:0]{index=0}

> **Cevap formatı standardı:** Her controller `res.status(...).json(...); return;` deseniyle yanıt verir. `return res.status(...).json(...)` **kullanılmaz**. :contentReference[oaicite:1]{index=1}

---

## 1) Amaç & Kapsam

**Teklif (Offer)**; ensotek ürünleri veya yedek parçalardan (sparepart) oluşan kalemleri,
KDV ve masraflarla birlikte **net/KDV/brüt toplam** hesaplanmış şekilde saklar; PDF üretir ve müşteriye e-posta ile iletir.
Ayrıca halka açık formdan gelen **teklif talebini** otomatik müşteri oluşturarak kayda çevirir ve adminleri bilgilendirir.

---

## 2) Veri Modeli ve Tipler

### 2.1 TypeScript tipleri (`modules/offers/types.ts`)
- **Durumlar:** `OfferStatus = "draft" | "preparing" | "sent" | "pending" | "approved" | "rejected"`.
- **Kalem tipi:** `OfferItemType = "ensotekprod" | "sparepart"`.
- **Kalem (IOfferItem):**
  - Discriminant: `productType`.
  - **Ref alanları:** `ensotekprod?` (productType = ensotekprod) | `sparepart?` (productType = sparepart).
  - Fiyatlar: `unitPrice`, opsiyonel `customPrice` (varsa hesapta bu baz alınır), `vat` (%), `total` (satır brüt).
- **Teklif (IOffer):** tenant, offerNumber, source, `company`, `customer`, `user`,
  `items[]`, ek tutarlar (`shippingCost`, `additionalFees`, `discount`),
  `currency`, `paymentTerms`, `validUntil`, `status`, **toplamlar** (`totalNet`, `totalVat`, `totalGross`),
  `pdfUrl`, `revisionHistory[]`, `email{ to, cc, bcc, subject, body, lastEmailError }`,
  gönderim damgaları (`sentByEmail`, `sentAt`, `acceptedAt`, `declinedAt`), `attachments[]`, `createdBy`, timestamps.

### 2.2 Mongoose şeması (`modules/offers/model.ts`)
- **OfferItemSchema (alt belge):**
  - `productType` (enum), `ensotekprod?`, `sparepart?`, `productName{i18n}`, `quantity`, `unitPrice`, `customPrice?`,
    `vat%`, `total` (hesaplanır).
  - **Pre-validate guard:**  
    - Aynı anda **iki ref birden dolu olamaz**.  
    - `ensotekprod` seçildiyse ref zorunlu; `sparepart` için de aynı kural.
- **OfferSchema (ana belge):**
  - **Index’ler:**  
    - `{ tenant, offerNumber }` **unique**  
    - `{ tenant, status, createdAt: -1 }` (listeleme ve raporlama)
  - **i18n alanları** (`productName`, `paymentTerms`, `notes`, `email.subject`, `email.body`) **TranslatedLabel** kurgusuna uygundur. Modül genel i18n standardına bağlıdır. :contentReference[oaicite:2]{index=2}
- **Toplam Hesabı (`recalcTotals`)**  
  - **Satır net:** `price * qty` (price = `customPrice ?? unitPrice`)  
  - **Satır KDV:** `lineNet * (vat/100)`  
  - **Satır brüt:** `lineNet + lineVat` → `it.total`  
  - **Teklif net:** satır netlerin toplamı  
  - **Teklif KDV:** satır KDV toplamı  
  - **Ekstralar:** `shippingCost + additionalFees - discount`  
  - **Brüt toplam:** `sumNet + sumVat + extras` (negatif çıkarsa `0`)  
  - **Yuvarlama:** tüm ara değerler **2 hane**ye yuvarlanır.
- **Otomasyon:** `pre("validate")` içinde `recalcTotals` çağrılır; ayrıca instance method `doc.recalcTotals()` mevcuttur.

---

## 3) PDF Üretimi ve Revizyonlar

### 3.1 Populate (PDF için minimal)
Aşağıdaki populate seti PDF’e yeterli bilgiyi sağlar:
- `company` → `"companyName email phone website images address bankDetails taxNumber handelsregisterNumber registerCourt"`
- `customer` → `"companyName contactName email phone address"`
- `items.ensotekprod` → `"name price"`
- `items.sparepart`   → `"name price"`

### 3.2 PDF Pipeline
- `generateAndAttachPdf(OfferModel, offerId, locale, userId?)`
  1) Belge populate edilir (yukarıdaki reçete).  
  2) `generateOfferPdf(...)` ile PDF oluşturulur.  
  3) `offerDoc.pdfUrl` set edilir, `revisionHistory[]`’e **yeni revizyon** push edilir.  
  4) Kayıt kaydedilir.

**Not:** PDF üretimi; altyapıda `generateOfferPdf.ts`, `addLogoToPdf.ts`, `getLogoBuffer.ts`, `uploadBufferToCloudinary.ts` gibi yardımcılarla markalama ve upload akışını yürütür (Cloudinary vb. entegrasyon). Config/kimlik bilgileri **tenant mail/context & storage** katmanlarıyla gelir.

### 3.3 PDF Ne Zaman Yenilenir?
`shouldRegeneratePdf(body)` şu alanlardaki değişikliklerde **true** döner:  
`items`, `shippingCost`, `additionalFees`, `discount`, `currency`, `validUntil`, `notes`, `paymentTerms`, `contactPerson`.

---

## 4) E-posta Gönderimi

### 4.1 Trigger’lar
- **CREATE** sonrası, kayıt başarıyla oluşturulunca **otomatik e-posta** gönderilir.
- **Status → "sent"** güncellemesinde, eğer “sent” olduysa **e-posta** gönderilir.

### 4.2 İçerik ve Şablon
- `getTenantMailContext(req)` ile **brandName / senderEmail / frontendUrl** alınır.
- `offerEmailSubject(offerNumber, locale)` ve `offerEmailTemplate({...})` ile çok dilli şablon hazırlanır.
- PDF yoksa **önce PDF üretilir**, linki e-posta içine eklenir.
- Kalem satırları için gösterim: **ad (i18n çözümü)**, **miktar**, **birim fiyat**, **satır brüt**.  
  Para gösterimi `Intl.NumberFormat` ile locale + currency bazlıdır.
- Gönderim sonrası: `sentByEmail = true`, `sentAt = now`, `email.lastEmailError = null`.

**Hata durumunda** e-posta hatası `email.lastEmailError` alanına yazılır; log’a düşer.

---

## 5) Public Talep Akışı

**Endpoint:** `POST /offers/request-offer` (public)

- Zorunlu alanlar: `name, email, phone, company, productId, productType("ensotekprod"|"sparepart")`.
- **Customer Upsert:** `email+tenant` bazında müşteri yoksa **otomatik oluşturulur** (pasif).
- **Item enrich:** productType’a göre `Ensotekprod|Sparepart` lookup + `name/price` ile kalem hazırlanır.
- **Offer create:** `source = "publicForm"`, 14 gün geçerli `validUntil`, tek kalemlik draft.
- **Admin Bildirim:** `Notification` kaydı oluşturulur (in-app) → `target.roles = ["admin"]`.

---

## 6) Validasyonlar (express-validator)

- **ID’ler:** route param `:id` → MongoId kontrolü.
- **Kalem doğrulaması (create & update):**
  - `productType` ∈ { ensotekprod, sparepart }.
  - Tipine göre **ilişkili ref zorunlu** ve 24 hex ObjectId formatında.
  - `quantity > 0`, `unitPrice >= 0`, `customPrice >= 0`, `0 <= vat <= 100`.
- **Create zorunluları:** `company`, `customer`, `items[≥1]`, `validUntil (ISO)`.
- **Update:** Tüm alanlar opsiyonel; gelenler tipine göre doğrulanır.
- **Status update:** `status` ∈ { draft, preparing, sent, pending, approved, rejected }.

---

## 7) Controller Özetleri

### 7.1 `listOffers(req,res)`
Filtreler: `status`, `company`, `customer`, `user`, tarih aralığı (`from`–`to` → `createdAt`), serbest metin `q` (offerNumber/contactPerson/email).  
Sayfalama: `page=1`, `limit=20` (varsayılan).  
**Populate:** `company(companyName,email)`, `customer(companyName,contactName,email)`.  
**Güvenlik:** `-acceptTokenHash` **select dışı**.

### 7.2 `getOffer(req,res)`
`_id + tenant` ile bul; `user(name,email)`, `company`, `customer`, `items.*(name,price)` populate.

### 7.3 `createOffer(req,res)`
- `company` & `customer` var mı doğrulanır.
- `items` **enrich** edilir (üründen isim/fiyat TL alınır).
- `recalcTotals` + **save**.
- **PDF üret** + **müşteriye e-posta gönder** (başarısızsa `email.lastEmailError` setlenir).
- 201 ve populate edilmiş final belge döner.

### 7.4 `updateOffer(req,res)`
- Gelen alanlar set edilir, `items` geldiyse yeniden **enrich** edilir.
- `recalcTotals` + **save**.
- İçerik değişimiyse **PDF regenerate**.
- 200 ve populate edilmiş final belge döner.

### 7.5 `updateOfferStatus(req,res)`
- `statusHistory[]`’ye `{status, at, by, note}` push.
- Yeni durum **"sent"** ise **e-posta gönder** (gerekirse PDF oluştur).
- 200 `{ id, status }`.

### 7.6 `deleteOffer(req,res)`
- Soft değil, **hard delete** (iş kuralına göre ileride soft’a çevrilebilir).
- 200 `"deleted"`.

> **Tüm isteklerde tenant izolasyonu:** Middleware `getTenantModels(req)` kullanır; sorgular **ilgili tenant DB/collection** üzerinde çalışır. FE → BE çağrılarında `x-tenant` zorunlu header’dır. :contentReference[oaicite:3]{index=3}

---

## 8) Populate Reçeteleri

- **Admin Detay:**  
  `user(name,email)`, `company(companyName,email)`, `customer(companyName,contactName,email)`,  
  `items.ensotekprod(name,price)`, `items.sparepart(name,price)`
- **PDF:** Bölüm 3.1’deki minimal set.

---

## 9) Performans & Index

- **Unique:** `{ tenant, offerNumber }` → iş anahtarı.
- **Listeleme:** `{ tenant, status, createdAt:-1 }` → filtre + son oluşturulanlar.
- **Not:** Sık aranan alanlar (offerNumber, email) regex ile kullanılmakta; gerekirse `offerNumber` için ek index düşünülebilir.

---

## 10) Hata Mesajları ve i18n

- Tüm hata/success mesajları modülün i18n setinden gelir (`./i18n`).  
- TL çözümü: `resolveTL(tl, locale)` — locale, `en` veya ilk dolu değere fallback.  
- FE i18n standardı ve TL tipleri **Merkezi i18n standardı** ile uyumludur. :contentReference[oaicite:4]{index=4}

---

## 11) Örnek İstekler (cURL)

> **Header’lar:** `x-tenant: ensotek`, opsiyonel `Accept-Language: de|tr|en`  
> Auth gereken uçlarda `Authorization: Bearer <token>`

### 11.1 Listeleme
```bash
curl -X GET "$BASE_URL/offer?page=1&limit=20&status=sent&q=OFR-" \
  -H "x-tenant: ensotek" -H "Authorization: Bearer $TOKEN"
````

### 11.2 Teklif Oluşturma (admin)

```bash
curl -X POST "$BASE_URL/offer" \
  -H "x-tenant: ensotek" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{
    "company": "66b9...c0ef",
    "customer": "66c1...a91d",
    "items": [
      {
        "productType": "ensotekprod",
        "ensotekprod": "66d2...f3a1",
        "quantity": 2,
        "unitPrice": 1200,
        "customPrice": 1100,
        "vat": 19
      }
    ],
    "shippingCost": 50,
    "additionalFees": 0,
    "discount": 100,
    "currency": "EUR",
    "paymentTerms": { "tr": "Peşin", "en": "Prepaid", "de": "Vorkasse", "pl":"", "fr":"", "es":"" },
    "notes": { "tr": "Teslim süresi 2 hafta", "en":"Delivery in 2 weeks", "de":"Lieferung in 2 Wochen", "pl":"", "fr":"", "es":"" },
    "validUntil": "2025-12-31T00:00:00.000Z",
    "contactPerson": "John Doe"
  }'
```

### 11.3 Güncelleme (kalem değiştirme → PDF yeniden üretir)

```bash
curl -X PUT "$BASE_URL/offers/66f1...a2b3" \
  -H "x-tenant: ensotek" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{ "discount": 150, "items": [ { "productType":"sparepart", "sparepart":"66ee...7cd0", "quantity":1, "vat":19 } ] }'
```

### 11.4 Durum Güncelleme (sent → e-posta tetikler)

```bash
curl -X PATCH "$BASE_URL/offers/66f1...a2b3/status" \
  -H "x-tenant: ensotek" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{ "status": "sent", "note": "Mail ile gönderildi." }'
```

### 11.5 Silme

```bash
curl -X DELETE "$BASE_URL/offers/66f1...a2b3" \
  -H "x-tenant: ensotek" -H "Authorization: Bearer $TOKEN"
```

### 11.6 Public Talep

```bash
curl -X POST "$BASE_URL/offers/request-offer" \
  -H "x-tenant: ensotek" -H "Content-Type: application/json" \
  -d '{
    "name":"Alice",
    "email":"alice@example.com",
    "company":"Alice GmbH",
    "phone":"+49 123 456",
    "productId":"66ee...7cd0",
    "productType":"sparepart",
    "message":"Lütfen fiyat ve termin bilgisini gönderin."
  }'
```

---

## 12) Test Senaryoları (Hızlı Check-List)

**Happy Path**

1. **Create Offer** (ensotekprod kalemi ile, customPrice girerek) → 201, PDF üretildi, e-posta gönderildi (customer.email var ise), `revisionHistory[0]` dolu.
2. **List Offers** (status, q ile) → 200, `meta.page/limit/total` doğru.
3. **Get Offer** (populate alanları dolu) → 200.
4. **Update Offer** (kalem değişikliği) → 200, PDF **yeniden üretildi** (revizyon sayısı +1).
5. **Update Status → sent** → 200, e-posta gönderildi, `sentAt` set.
6. **Delete Offer** → 200 `"deleted"`.

**Validasyon / Edge**

1. **İki ref birlikte** (`ensotekprod` + `sparepart`) → 400/422 (pre-validate error).
2. **productType uyumsuz** (tip = ensotekprod ama `ensotekprod` yok) → 400/422.
3. **quantity ≤ 0** veya fiyat < 0 → 400/422.
4. **discount** çok yüksek → brüt negatif hesaplanırsa **0**’a clamp edilir.
5. **customer.email yok** → create başarılı; **e-posta atlanır**, `email.lastEmailError` **değişmez**, log’da uyarı.
6. **PDF üretimi hata** → kayıt devam eder, `pdfUrl` boş kalabilir, hata log’lanır; durum güncellemede tekrar denenir.
7. **ID geçersiz** → 400 `invalidOfferId`.
8. **Tenant header yok/yanlış** → 404/tenant resolve hatası.&#x20;

---

## 13) Güvenlik & Çoklu Tenant

* **Zorunlu header:** `x-tenant` → backend tenant çözümlemesi **middleware** ile yapılır; tüm model erişimleri `getTenantModels(req)` üzerinden gerçekleşir (db-per-tenant/single-db fark etmez, kontrat değişmez).&#x20;
* **Seçili alan gizleme:** `acceptTokenHash` hiçbir list/detay seçkisinde dönmez.
* **Auth:** Admin uçları `authenticate` + (liste/silmede) `authorizeRoles("admin")`.

---

## 14) FE Notu (kısa)

* Tüm çağrılarda **`x-tenant`** otomatik gönderilmelidir (Axios interceptor / `apiCall` kurulumu).
* FE slice’larında `apiCall` **doğrudan payload** döndürür; `res.data` **kullanma**. Örnek slice talimatı için standart dokümana bak.&#x20;

---

## 15) SSS / Troubleshooting

* **“Both product refs set” hatası:** Kalem oluştururken yalnızca **tek bir ref** gönder. Tip ile ref **tutarlı** olmalı.
* **Brüt sıfırlandı:** İndiriminiz `net+KDV+ekstralar`ı aşıyor; sistem brütü **0**’da sınırlar.
* **E-posta gitmedi:** `customer.email` eksik olabilir veya SMTP/tenant mail context hatası. Hata `email.lastEmailError` alanında.
* **PDF boş:** İlk create’te üretim hata verdiyse, **status=sent** güncellendiğinde tekrar denenecektir.

---

**Sürüm:** 2025-08-16 · **Modül:** `offers` · **Tenant:** `ensotek`

```

---

İstersen sonraki adımda **admin FE slice + sayfalar** için RTK şablonunu ve minimal UI akışını da çıkarırım.
```
