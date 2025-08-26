harika — özet dokümanından gördüğüm kadarıyla **Faz-1 kontratı kapanmış** görünüyor (public menü/availability, cart→checkout akışı, ödeme/fiş ve bildirim & raporların kontrat seviyesinde tanımı mevcut). Şimdi, söz verdiğim gibi **Faz-2 sözleşmesini** çıkarıyorum. Yine **çok-kiracılı, i18n-hazır, TRY varsayılanı ve Europe/Istanbul TZ** varsayımlarıyla; **kod yok**, sadece kontrat & dokümantasyon.

---

# Faz 2 Kapsamı — Restaurant Ordering (MetaHub Standartları, **kod yok**)

Bu faz; Faz-1’in üzerine **teslimat bölgeleri/ücret**, **kupon/promosyon**, **planlı sipariş & zaman aralığı**, **kısmi iade**, **gelişmiş tracking/iptal**, **stok & şube bazlı fiyat**, **webhook’lar** ve **zengin raporlar** ekler.

## 0) Dosya Yapısı (ek dokümantasyon)

* `backend/modules/branch/README.md` (güncelle: delivery-zones & timeslots)
* `backend/modules/menu/README.md` (güncelle: branch-price, stock/out-of-stock, combos)
* `backend/modules/cart/README.md` (güncelle: kupon, min sepet, idempotency)
* `backend/modules/orders/README.md` (güncelle: scheduled, cancel, public-tracking)
* `backend/modules/payments/README.md` (güncelle: partial refund, authorization/capture)
* `backend/modules/invoicing/README.md` (güncelle: iade belgesi/credit note)
* `backend/modules/notifications/README.md` (güncelle: status şablonları, throttle)
* `backend/modules/reports/README.md` (güncelle: kampanya/kupon performansı)
* **Yeni:** `backend/modules/promotions/README.md` (kupon & kampanya motoru)
* **Yeni:** `backend/modules/webhooks/README.md` (event abonelikleri)

> Her README sadece modülün kendi kurallarını içerecek; “Ortak Sözleşme” tekrarlanmaz.

---

## 1) Ortak Sözleşme — Faz-2 Ekleri

**Yeni/ek header’lar**

* `x-request-id` (zorla üret, log & response’a geri koy)
* `x-idempotency-key` (POST /orders, POST /payments vb. için **idempotent create**)
* `Accept-Language: tr-TR | en-US` (i18n seçimi)
* **Rate limit header’ları**: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`

**SORT/PAGE/LIMIT standardizasyonu (global)**
Tüm liste uçlarında: `?page=1&limit=20&sort=createdAt:desc` + `meta { page, limit, total }` **zorunlu**.

**Id doğrulama & ETag/If-None-Match (opsiyonel)**
GET detay uçlarında ETag sun, `If-None-Match` ile 304 dönebil.

**Hata anahtarları (örnek yeni)**

* 409: `"operation.idempotentReplay"`
* 409: `"coupon.alreadyUsed"`
* 422: `"order.minTotal.notMet"`
* 422: `"schedule.slot.unavailable"`

---

## 2) Branch — Delivery Zones & Timeslots

**Yeni Alanlar**

* `deliveryZones[]`: `{ code, name(i18n), area(Polygon), fee{amount,currency}, minOrder{amount,currency}, etaMin, etaMax, isActive }`
* `timeslotRules`: servis türüne göre planlanabilir aralıklar
  `pickup|delivery: { dayOfWeek, start, end, intervalMinutes, capacityPerSlot }`

**Yeni Uçlar**

* `GET /public/branches/:id/delivery/check?lat=&lng=&cartTotal=` → `{isCovered, zoneCode, fee, minOrder, etaRange}`
* `GET /public/branches/:id/timeslots?serviceType=pickup&date=YYYY-MM-DD` → uygun slot listesi
* `POST /admin/branches/:id/delivery-zones` / `PATCH` / `DELETE` — CRUD
* `POST /admin/branches/:id/timeslots/test` — kural simülasyonu (admin)

**Validasyon**

* Polygon geçerliliği; `minOrder.amount >= 0`, `fee.amount >= 0`, `etaMin<=etaMax`
* Timeslot: `intervalMinutes ∈ {5,10,15,20,30,60}`, kapasite ≥ 0

---

## 3) Menü & Katalog — Şube Bazlı Fiyat, Stok, Combo

**Yeni Kabiliyetler**

* **Branch price override**: `menuitem.variants[*].branchPrices[{branchId, amount, currency}]`
* **Stok/limit**: `menuitem.stockPolicy = none | perDay | hardStock` + `dailyLimit`, `isSoldOut`
* **Combo/Bundle** (MVP): `menucombo`: `{ items: [{menuItemId, variantCode?, quantity, allowModifier?}], comboPrice }`

**Yeni/Revize Uçlar**

* `GET /public/menuitems?branchId=&q=&categoryId=` → branch price uygulanmış, sold-out filtreli
* `POST /admin/menucombos` / `GET` / `PATCH` / `DELETE`
* `PATCH /admin/menuitems/:id/stock` → `{isSoldOut, dailyLimit}`

**Validasyon**

* Branch price olduğunda currency uyumu (TRY varsayılan)
* Combo toplam alt parçalar > 0, comboPrice > 0
* Stok poliçesi: `hardStock` ise ekleme sırasında düşürme kuralı

---

## 4) Cart / Order-Draft — Kupon, Min Sepet, Otomatik Ücretler

**Yeni Kurallar**

* **Kupon**: yüzde/flat, kapsam (categoryId|itemId|branchId), başlangıç/bitis, kullanım sayısı, kişi başı limit
* **Min sepet**: seçilen delivery zone veya şube kuralından türetilir
* **Otomatik deliveryFee/serviceFee**: branch/zone & kampanya ile override
* **Idempotency**: `x-idempotency-key` ile `/cart/checkout`

**Yeni/Revize Uçlar**

* `POST /public/coupons/validate` → `{valid, discount, reason?}`
* `PATCH /cart/pricing` → `couponCode` ekrana alır; invalid → 422 `"coupon.invalid"`
* `POST /cart/checkout` → min-order, slot uygunluğu, zone ücreti doğrulanmış snapshot ile `orders`a aktarır

**Validasyon**

* `order.total > 0`, kupon kapsam kontrolü, min sepet sağlanmadıysa `"order.minTotal.notMet"`

---

## 5) Orders — Planlı Sipariş, İptal, Tracking

**Yeni Durum Kuralları (allowed transitions net)**
`pending → confirmed → in_kitchen → ready → (pickup: picked_up | delivery: out_for_delivery) → delivered → completed`
İptal: `canceled` (yetkili) / `customer_canceled` (pencere içinde)

**Yeni Yetkinlikler**

* **Scheduled**: `plannedAt` (pickup/delivery slot), slot kapasite tüketimi
* **Customer cancel**: `pending|confirmed` ve `plannedAt - cancelWindow >= now`
* **Public tracking**: `GET /orders/:publicToken/track` (maskeli id) + konum/ETA (opsiyon: Faz-3)

**Uçlar**

* `PATCH /orders/:id/status` — allowed transitions kontrolü + `422 "order.status.transitionNotAllowed"`
* `PATCH /orders/:id/cancel` — kullanıcı iptali (kurallı)
* `PATCH /orders/:id/schedule` — (admin) slot değişimi

**Populate (admin detay)**

* `payments(summary), coupon(code,discount), branch(zoneSnapshot), plannedSlot`

---

## 6) Payments — Partial Refund, Authorization/Capture

**Kapsam**

* **Partial refund**: `POST /admin/payments/:id/refund { amount }`
* **Auth/Capture** (online): `status = authorized → captured|voided`
* **Idempotent create**: ödeme oluşturma ve capture için `x-idempotency-key`

**Uçlar**

* `POST /admin/payments/:id/refund` — amount ≤ kalan tahsilat; iade belge akışı tetikler
* `POST /admin/payments/:id/capture` — auth→capture
* `POST /admin/payments/:id/void` — auth→void

**Validasyon/Hatalar**

* `"payment.refund.amountTooHigh"`, `"payment.capture.invalidState"`

---

## 7) Invoicing — İade Belgesi (Credit Note) & Birleştirme

**Kapsam**

* **Credit note**: refund ile ilişkili iade belgesi (kısmi/tam)
* **Merge**: aynı gün çoklu küçük siparişler için tek fiş (opsiyonel, policy tabanlı)

**Uçlar**

* `POST /admin/invoices/from-order { orderId }` — siparişten fiş üretir
* `POST /admin/invoices/:id/credit-note { paymentRefundId, amount }`
* `GET /admin/invoices/:id/pdf` — mevcut altyapı ile link döndürür

---

## 8) Notifications — Gelişmiş Şablon & Kanallar

**Kanallar**: email, webhook, (opsiyon: SMS/push gateway)

**Olaylar**

* `order.status.confirmed|ready|delivered|customer_canceled`
* `payment.authorized|captured|refunded`
* `coupon.applied|rejected`

**Uçlar**

* `POST /admin/notifications/test` — şablon + değişkenlerle deneme
* `POST /admin/webhooks` / `GET` / `DELETE` — abonelik yönetimi (bkz. Webhooks modülü)

**Throttle & tercih**

* Kullanıcı kanal tercihleri; aynı olay için “en fazla X/dakika” koruması

---

## 9) Promotions (Yeni Modül) — Kupon & Kampanya

**Varlıklar**

* `coupon`: `{ code, type(percentage|fixed), value, scope{category|item|branch|all}, startsAt, endsAt, usageLimit, perUserLimit, minOrder, isActive }`
* `promotion`: kural tabanlı otomatik indirim (örn. “2 al 1 öde”, “₺150 üzeri ücretsiz teslimat”)

**Uçlar**

* `POST /admin/coupons` / `GET` / `PATCH` / `DELETE`
* `POST /admin/promotions` / `GET` / `PATCH` / `DELETE`
* `POST /public/coupons/validate` (Cart bölümünde kullanılır)

**Kurallar**

* Çakışma çözümü: en yüksek avantaj + “aynı anda max N promosyon” politikası

---

## 10) Webhooks (Yeni Modül)

**Abone Olunabilir Olaylar**

* `order.created|status_changed|canceled`
* `payment.created|authorized|captured|refunded`
* `invoice.created|credit_note.created`

**Uçlar**

* `POST /admin/webhooks` — `{ url, secret?, events[] }`
* İmzalama: `X-Webhook-Signature` (HMAC-SHA256, body + timestamp)
* Yeniden deneme: exponential backoff, maxAttempts=6

---

## 11) Reports — Faz-2 Gösterge Tabloları

**Yeni Raporlar**

* **Saatlik satış ısı haritası** (gün/gün & saat bazlı adet/ciro)
* **Kategori/ürün kârlılık** (vergi/ücret sonrası net)
* **Kupon performansı** (kullanım, indirim toplamı, sepet etkisi)
* **İptal nedenleri** (status & reason dağılımı)
* **Zamanında teslim/pickup oranı** (SLA)

**Uçlar (özet)**

* `GET /admin/reports/sales/hourly?from=&to=&branchId=`
* `GET /admin/reports/coupons/performance?from=&to=&code=`
* `GET /admin/reports/orders/cancellations?from=&to=`

---

## 12) Kabul Kriterleri (Faz-2)

1. **Teslimat kapsamı & ücret**

* `delivery/check` doğru zone + `fee/minOrder/eta` döner; kapsama dışı ise `isCovered=false`.

2. **Zaman aralığı & planlı sipariş**

* `timeslots` kapasiteyi dikkate alır; slot doluysa 422 `"schedule.slot.unavailable"`.

3. **Kupon/promosyon**

* Geçerli kupon uygulandığında cart total doğru azalır; kapsam/dönem dışı kupon reddedilir.

4. **İptal & kurallı akış**

* Müşteri iptali pencere içindeyse `200`; aksi 422 `"order.cancel.windowPassed"`.

5. **Kısmi iade**

* `POST /admin/payments/:id/refund {amount}` → amount doğrulanır; iade belgesi üretilir.

6. **Idempotency**

* Aynı `x-idempotency-key` ile tekrarlanan create istekleri **aynı sonucu** döner.

7. **Raporlar**

* Kupon performans raporu toplam indirim ile birebir uyuşur; saatlik satış toplamları günlükle tutarlıdır.

---

## 13) Test Senaryoları (örnek)

**Happy Path**

* (HP-1) `delivery/check` → zone bulundu, min sepet ≥ koşulu → checkout başarılı.
* (HP-2) `timeslots` → slot seçildi, planned pickup ile sipariş oluşturuldu.
* (HP-3) Kupon uygulandı → total düştü, raporda kupon performansı göründü.
* (HP-4) Kart ödemesi `authorized` → `capture` → kısmi `refund` → credit note üretildi.
* (HP-5) Status değişimleri (pending→…→completed) bildirimleri i18n ile gitti.

**Edge / Validasyon**

* (V-1) Kapsama dışı koordinat → `isCovered=false`.
* (V-2) Min sepet yetersiz → 422 `"order.minTotal.notMet"`.
* (V-3) Slot dolu → 422 `"schedule.slot.unavailable"`.
* (V-4) Kupon süresi bitmiş → 422 `"coupon.expired"`.
* (V-5) Refund amount fazla → 422 `"payment.refund.amountTooHigh"`.
* (V-6) Idempotent create tekrarlandı → 200 (aynı kaynak/yanıt).

---

## 14) Sprint Planı (öneri, 3 sprint)

**Sprint A — Delivery & Scheduling**

* Delivery zones + `delivery/check`
* Timeslot kuralları + public `timeslots`
* Cart’ta min sepet & otomatik fee

**Sprint B — Promotions & Orders**

* Kupon doğrulama/uygulama
* Order cancel/schedule/public tracking
* Status-based notifications (şablonlar)

**Sprint C — Payments & Invoicing & Reports**

* Partial refund + credit note
* Auth/capture/void akışı (provider-agnostic)
* Rapor seti (hourly, coupon, cancellations)

---

## 15) NFR (Faz-2 ekleri)

* **Idempotency & Exactly-once**: create akışlarında zorunlu.
* **Oran sınırlama**: public uçlar için stricter rate-limits (IP+tenant).
* **Gözlemlenebilirlik**: event-driven metrikler (order lead time, slot fill rate).
* **Veri tutarlılığı**: refund→credit note eventual consistency SLA (≤ 2 dk).
* **Gizlilik**: public tracking token tek-kullanımlık/expire (örn. 48 saat).
* **Dayanıklılık**: webhook retry with backoff, dead-letter queue (operasyon notu).

---

İstersen bu Faz-2 başlıklarından önce **Promotions** ve **Delivery Zones**’u öne alıp paralel başlatabiliriz. Ayrıca her README için **alan sözlüğü + örnek istek/yanıt** taslağını da çıkarabilirim (yine **kod yok**).
