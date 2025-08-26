# Faz 1 Kapsamı — Restaurant Ordering (MetaHub Standartları, **kod yok**)

Aşağıdaki içerik: **çok-kiracılı** (her istekte `x-tenant` zorunlu), i18n-hazır, TRY varsayılan para birimi ve Europe/Istanbul TZ kabulüyle hazırlanmıştır. Bu aşamada **yalnızca sözleşme & dokümantasyon** veriyoruz; implementasyon yoktur.

---

## 0) Dosya Yapısı (Dokümantasyon)

* `backend/modules/branch/README.md`
* `backend/modules/menu/README.md`
* `backend/modules/orders/README.md`
* `backend/modules/payments/README.md`
* `backend/modules/invoicing/README.md`
* `backend/modules/notifications/README.md`
* `backend/modules/reports/README.md`

> Not: Her README, aşağıdaki “Ortak Sözleşme” kurallarını tekrar etmeyecek; sadece modül özelindeki detayları içerir.

---

## 1) Ortak Sözleşme (Tüm Modüller)

**Zorunlu Header’lar**

* `x-tenant: gzl` (veya aktif tenant kodu)
* `Content-Type: application/json`

**Response Zarfı (standart)**

```json
{
  "success": true,
  "message": "i18n.key.or.empty",
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 135 }
}
```

**Hata Örnekleri**

* 400: `"tenant.required"`
* 401: `"auth.required"`
* 404: `"resource.notFound"`
* 409: `"resource.conflict"`
* 422: `"validation.failed"` + alan bazlı `"*.invalid" | "*.required"`

**Liste Uçları Varsayılanları**

* `?page=1&limit=20&sort=createdAt:desc`
* Filtreler: isim/slug/code arama, isActive, categoryId, branchId, serviceType vb.

**İndeks & Kimlik**

* Her koleksiyonda `tenant` zorunlu + indeksli.
* FE’de string, BE’de ObjectId; id doğrulaması zorunlu.

**i18n**

* TranslatedLabel alanları: `name`, `description` vb. (en az `tr`/`en`).
* Hata mesajları i18n key olarak dönülür.

---

## 2) Branch (Şube) — CRUD + Temel Uçlar

**Belge**: `backend/modules/branch/README.md`

**Kapsam**

* Şube konumu (2dsphere), servis türleri: `delivery|pickup|dinein`
* Çalışma saatleri (hafta içi gün/saat)
* Teslimat bölgeleri (Polygon) — **Faz 2’de** ücret ve kapsama kontrolü detaylanacak
* Min hazırlık süresi (dakika)

**Endpoint Listesi (özet)**

* `POST /admin/branches` — oluştur
* `GET /admin/branches` — listele (filtre: isActive, service, text)
* `GET /admin/branches/:id` — detay
* `PATCH /admin/branches/:id` — güncelle
* `DELETE /admin/branches/:id` — sil (yumuşak silme opsiyonel)
* `GET /public/branches` — müşteriye açık, aktif şubeler
* `GET /public/branches/:id/availability` — **menü saat penceresi** (Faz 1 “temel”: açık/kapalı)

**Validasyon (kritik)**

* location: GeoJSON Point `[lng, lat]`, 2dsphere index
* services: boş olamaz (en az 1)
* openingHours: day(0–6), open/close `HH:mm`

**Populate Reçetesi**

* (Faz 1) Gerek yok; sadece kendi alanları

---

## 3) Menü & Katalog — Category/Item/Variant/Modifier/Availability

**Belge**: `backend/modules/menu/README.md`

**Varlıklar**

* `menucategory`: sıra, i18n ad, isActive
* `menuitem`: i18n ad/açıklama, görsel, categoryId, **variants**(fiyatlı), **modifierGroups**(min/max/zorunlu), taxRate
* `availability` (temel): item/category bazlı “gün/saat” penceresi

**Endpoint Listesi (özet)**

* Kategori:

  * `POST /admin/menucategories`
  * `GET /admin/menucategories`
  * `PATCH /admin/menucategories/:id`
  * `DELETE /admin/menucategories/:id`
  * `GET /public/menucategories` (aktifler)
* Ürün (menuitem):

  * `POST /admin/menuitems`
  * `GET /admin/menuitems?categoryId=&q=&isActive=`
  * `GET /admin/menuitems/:id`
  * `PATCH /admin/menuitems/:id`
  * `DELETE /admin/menuitems/:id`
  * `GET /public/menuitems?categoryId=&q=` (aktif + saat filtresi)
* Availability:

  * `POST /admin/menuavailability` (categoryId|itemId tekil zorunlu)
  * `GET /admin/menuavailability?itemId=&categoryId=`
  * `PATCH /admin/menuavailability/:id`
  * `DELETE /admin/menuavailability/:id`

**Validasyon**

* `variants[*].price.amount` > 0, `currency` varsayılan TRY
* `modifierGroups[*].min <= max`, `required=true` ise `min>=1`
* `availability` aralıkları: `dayOfWeek`(0–6), `start/end` `HH:mm`
* `taxRate` 0–100

**Public Get (örnek kurallar)**

* Sadece `isActive=true`
* Saat uygunluğu **temel**: şube açık + öğe uygun → listelenir
* Fiyat: Faz 1’de tek fiyat (şube bazlı opsiyon Faz 3)

**Populate Reçetesi**

* `menuitem.categoryId(name)`
* (Faz 1) overfetch yok: minimal alanlar

---

## 4) Cart / Order-Draft — Fiyat Hesaplı Geçici Sepet

**Belge**: `backend/modules/orders/README.md` (Cart bölümü)

**Kapsam**

* Kullanıcı veya anonim oturumla sepet
* Item + variant + modifiers snapshot’ı
* Fiyat kırılımı: `items`, `modifiers`, `deliveryFee?`, `serviceFee?`, `tip?`, `discount?`, `tax?`, `total`

**Endpoint Listesi (özet)**

* `POST /cart` — yeni sepet oluştur (opsiyonel: mevcut sepet id ile merge)
* `GET /cart` — aktif sepeti getir (cookie/token bazlı)
* `POST /cart/items` — satır ekle: `{ menuItemId, variantCode, modifiers[], quantity }`
* `PATCH /cart/items/:lineId` — miktar/modifier değiştir
* `DELETE /cart/items/:lineId` — satır sil
* `PATCH /cart/pricing` — tip/kupon/ücret güncelle (kupon Faz 2)
* `DELETE /cart` — sepeti temizle
* `POST /cart/checkout` — **sipariş taslağını** `orders`’a aktarır (Faz 1’de basit senaryo)

**Validasyon**

* `menuItemId` geçerli ve aktif olmalı
* `variantCode` ürünün variant’ları içinde bulunmalı
* `modifiers` min/max kurallarına uymalı
* `quantity` 1–50

**Fiyatlama (Faz 1 Basit)**

* total = (variant price \* qty) + modifier deltalari + delivery/service/tip/discount/tax (varsa)
* vergi: tek oran (item.taxRate) ya da fiyat dahil — **netleştirme Faz 3**

---

## 5) Orders — Oluşturma & İzleme

**Belge**: `backend/modules/orders/README.md`

**Durum Akışı (Faz 1)**
`pending → confirmed → in_kitchen → ready → (pickup: picked_up | delivery: out_for_delivery) → delivered → completed`

* `canceled` (her aşamada yetkili tarafından)

**Endpoint Listesi (özet)**

* Public:

  * `POST /orders` — **cart/checkout** sonrası sipariş oluşturma (body: branchId, serviceType, items snapshot, prices, delivery|pickup|dinein bilgisi)
* Admin:

  * `GET /orders/admin?status=&branchId=&from=&to=` — liste
  * `GET /orders/:id` — detay (admin)
  * `PATCH /orders/:id/status` — akış güncelleme (allowed transitions)
* Müşteri:

  * `GET /orders/my` — kullanıcının siparişleri
  * `GET /orders/:id/public` — public tracking (maskeli id/token)

**Validasyon (kritik)**

* `branchId` tenant’a ait ve aktif olmalı
* `serviceType` → `delivery`: adres metni zorunlu, `pickup`: planlı saat ISO tarih (opsiyonel), `dinein`: masa kodu (Faz 3)
* `items` boş olamaz, her satırda unitPrice + quantity > 0
* `prices.total.amount` > 0 ve satırlarla uyumlu

**Populate Reçetesi (admin detay)**

* `branchId(name,location)`
* `customerId(contactName,phone,email)`
* `payments(amount,method,createdAt)`

---

## 6) Payments — MVP (Nakit/Manuel Onay)

**Belge**: `backend/modules/payments/README.md`

**Kapsam (Faz 1)**

* Nakit/Kapıda/Nakit-POS manuel “paid” işaretleme
* Basit iade (tamamı) — **partial refund Faz 2/3**
* Ödeme durumu siparişe işlenir: `unpaid|authorized|paid|failed|refunded`

**Endpoint Listesi (özet)**

* `POST /admin/payments` — siparişe ödeme kaydet `{ orderId, method, amount, currency }`
* `POST /admin/payments/:id/refund` — iade (tam)
* `GET /admin/payments?orderId=` — liste

**Validasyon**

* `amount` = `order.prices.total.amount` (Faz 1 tam ödeme)

---

## 7) Invoicing — MVP (Fiş)

**Belge**: `backend/modules/invoicing/README.md`

**Kapsam (Faz 1)**

* Fiş numarası, vergi satırları (özet), PDF opsiyon (dosyaya kaydetme mevcut altyapı ile)
* Sipariş paid → fiş üret (tek belge)

**Endpoint Listesi (özet)**

* `POST /admin/invoices` — `{ orderId }` ile fiş oluştur
* `GET /admin/invoices?orderId=` — liste
* `GET /admin/invoices/:id` — detay (download link alanı)

---

## 8) Notifications — Olay Tetikleri

**Belge**: `backend/modules/notifications/README.md`

**Olaylar (Faz 1)**

* `order.created` → müşteri + şube mail
* `order.status.confirmed|ready|delivered` → müşteri bildirimleri

**Şablon Alanları**

* `{orderCode}`, `{branchName}`, `{itemsTable}`, `{total}`, `{trackingUrl}`

**Endpoint Listesi (özet)**

* `POST /admin/notifications/test` — şablon testi (tenant mailine)

---

## 9) Reports — Basit Raporlar (Faz 1)

**Belge**: `backend/modules/reports/README.md`

**Kapsam**

* Günlük satış özeti (adet, ciro, ortalama sepet)
* Ürün satış adedi (top N)
* Servis türüne göre dağılım

**Endpoint Listesi (özet)**

* `GET /admin/reports/sales/daily?from=&to=&branchId=`
* `GET /admin/reports/products/top?from=&to=&limit=10`
* `GET /admin/reports/service-type-share?from=&to=`

---

## 10) Kabul Kriterleri (Faz 1)

1. **Menü Görünebilirliği**

* `GET /public/menucategories` + `GET /public/menuitems` aktif ve saat uygunluğuna göre döner.
* Variant/Modifier kuralları (min/max) ihlal edilemez.

2. **Sepet & Fiyat**

* Ekle/sil/güncelle işlemleri doğru fiyat kırılımını yansıtır.
* `total` negatif veya 0 olamaz (kupon yoksa).

3. **Sipariş Oluşturma**

* `POST /orders` → `201` ve `status=pending`.
* `delivery` ise adres metni zorunlu; `pickup` ise planlı saat ISO biçiminde geçerli (opsiyonel).

4. **Ödeme & Fiş**

* `POST /admin/payments` → sipariş `paid` olur.
* `POST /admin/invoices` → fiş oluşturur, `invoiceId` siparişe işlenir.

5. **Bildirimler**

* `order.created` ve `status` olaylarında şablonlar başarılı tetiklenir.

6. **Raporlar**

* Günlük satış toplamı `payments.paid` ve `orders.completed` temelinde doğru hesaplanır.

---

## 11) Test Senaryoları (Örnek, Faz 1)

**Happy Path**

* (HP-1) Kategori/Ürün oluştur → public listede görünür.
* (HP-2) Sepete 2 farklı ürün ekle (variant + modifier) → total doğru.
* (HP-3) Sipariş oluştur (pickup) → `201` + bildirim gider.
* (HP-4) Ödeme kaydet (nakit) → `paid` + fiş oluştur.
* (HP-5) Raporlar: Günlük ciro ve top ürünler dolu döner.

**Validasyon / Edge**

* (V-1) `x-tenant` yok → 400 `tenant.required`.
* (V-2) Modifier min/max ihlali → 422 `modifier.selection.invalid`.
* (V-3) `menuItemId` pasif/yanlış → 404 `menuitem.notFound`.
* (V-4) `branchId` tenant’a ait değil → 404 `branch.notFound`.
* (V-5) `prices.total` uyumsuz → 422 `order.prices.mismatch`.

---

## 12) Sprint Planı (2–3 hafta, Faz 1)

**Sprint 1 — Menü**

* Kategori + Ürün CRUD (admin)
* Public liste uçları (aktif/saat)
* Variant/Modifier kuralları
* Basit availability (gün/saat)

**Sprint 2 — Sepet & Sipariş**

* Cart/Order-Draft akışı (fiyat kırılımı)
* Order oluşturma + status başlangıcı (`pending`)
* Bildirim: `order.created`

**Sprint 3 — Ödeme, Fiş, Rapor**

* Payments (manuel nakit) → `paid`
* Invoicing (fiş) + dosya kaydı
* Basit raporlar + `order.status` ilerletme (admin panelde)

---

## 13) NFR’ler (Faz 1 için özet)

* **Performans**: liste uçlarında `limit<=100`; menü public uçlarında minimal alan seti; uygun indeksler (tenant, isActive, categoryId, createdAt).
* **Güvenlik**: admin uçlarında auth zorunlu; rate-limit public uçlar.
* **Gözlemlenebilirlik**: her istekte requestId; kritik akışlarda event log; hata anahtarı + context.
* **Uyumluluk**: tüm birimler TRY; para birimi alanı her fiyat parçasında mevcut (genişlemeye hazır).

---

### Sonraki Adım

İstersen her README için **alan sözlüğü (field dictionary)** ve **istek/yanıt örnekleri**ni (JSON örneği, şema değil) ekleyeyim; yine **kod yazmadan**, tamamen kontrat seviyesi ilerleyelim.
