harika — şimdi “neredeyiz ve sırada ne var”ı netleyelim. Kod yazmadan, kısa ve somut bir plan çıkarıyorum.

# Durum Özeti (tamamlananlar)

* **Katalog**: `brand`, `product_attribute`, `product_variant` ✓
* **Müşteri etkileşimi**: `wishlist`, `compare`, `review` ✓
* **Ödeme altyapısı**: `payment_provider` (tenant bazlı config), public/admin payment uçları, gateway tipleri ve adapter iskeletleri (Stripe/PayPal/iyzico/PayTR/Craftgate/Papara/Paycell) ✓
* **Vergi & bölge**: `tax_rate` + `geozone` ✓
* **Ücretler**: `fee_rule` (kapıda ödeme, paketleme vs) ✓
* **Arama**: `suggestion` + `search_index` (model + minimal kontrol) ✓
* **Webhooks (outbound)**: endpoint/delivery/dispatcher + güvenlik (HMAC, SSRF guard) ✓
* **Stok**: `inventory` (anlık stok) + servis (reserve/release/commit/recompute) ✓
* **Payments (projection)**: genişletilmiş payment şeması ve admin/public akışları ✓

> Not: “embed-first” stratejisine göre **asıl gerçeklik `order` içinde** olacak; `payments`, `shipments` vb. projeksiyonlar raporlama için doldurulacak.

---

# Eksik/Kalan Kritik Modüller (checkout & sipariş için şart)

1. **Cart** (eğer mevcutta yoksa standardize edelim)

   * guest + user birleştirme, item snapshot alanları, kupon alanı.
2. **Pricing Servisi**

   * `subtotal/discount/shipping/tax/fees ⇒ total`
   * bağımlılıklar: `tax_rate`, `shipping_method` (aşağıda), `fee_rule`, `coupon/promotion`.
3. **Shipping Method** (rate tabloları / sabit ücretler)

   * geozone + ağırlık/fiyat aralıkları; “standard/express” vb.
4. **Coupon / Promotion** (minimum)

   * kupon doğrulama ve tek-indirim uygulama (yığılmayı basit tutalım).
5. **Address Book** (user’ın adres defteri)

   * `/me/addresses` uçları; order içine **snapshot** kopyalanacak.
6. **Order (çekirdek)**

   * model + durum makinesi + timeline + minimal admin/public controller.
   * gömülü: `items[]`, `payment`, `shipments[]`, `returns[]`, `refunds[]`.
7. **Checkout modülü (public)**

   * **cart → order taslağı**, **stok rezervasyonu**, **payment intent** oluşturma (Stripe ile başla), idempotency.
   * Tracking endpoint (orderNo ile).
8. **Inbound Webhooks (provider)**

   * Stripe (ilk), sonra iyzico/paypal/paytr…
   * intent → order eşleme; **çift işlem & yarış** korumaları; commit/release stok.
9. **Idempotency Store**

   * `idempotency_keys` (tenant+key unique, TTL); checkout ve provider çağrılarında kullanacağız.
10. **Reservation TTL Job**

* `reservedUntil` dolan taslak siparişlerde rezervasyonu çöz (release).

11. **Stock Ledger (hareket defteri) [opsiyonel şimdi]**

* İleride hareket bazlı rapor istiyorsak `stock_ledger` modeli de ekleyelim; şu an servisler `inventory` üzerinden iş görüyor.

---

# Nice-to-have (v1 sonrası veya paralel)

* **Returns/RMA & Refund flow (provider refund API ile)**
* **Notifications** (mail/sms; order created/paid/shipped)
* **Media Asset** (görsel/asset tekleşmesi)
* **Analytics/Reports** (projeksiyonlardan)
* **Invoice/Accounting** entegrasyonları

---

# Önerilen Uygulama Sırası (MVP’ye odaklı)

1. **Address Book** (user/me uçları)
2. **Shipping Method** (basit tablo) + **Pricing servisi** (tax+shipping+fee+coupon)
3. **Order modeli** (embed alanlar, status machine, timeline)
4. **Checkout controller**

   * cart’tan order taslağı, **reserveStock**, `payment.intent` (Stripe), **idempotency**
   * `reservedUntil = now + 15m`
5. **Stripe inbound webhook**

   * `payment_intent.succeeded/failed` → order state, **commit/releaseStock**
   * yarış koşulları için koşullu update (idempotent)
6. **Tracking endpoint** (orderNo ile public read-only)
7. **Cron/Job**: reservation TTL cleanup
8. **Admin Order** minimal (status transitions: packing/shipped/delivered/cancelled)

> Sonra: iyzico/paypal/paytr/craftgate adapterlarının gerçek çağrıları + refund/iade.

---

# Risk & Kararlar (kısa)

* **Çifte işlem**: webhook + UI onay yarışını **koşullu update** ve `payment.status` kontrolüyle çözeceğiz.
* **Idempotency**: `tenant + key` unique; aynı request tekrarında **aynı order** dönecek.
* **Çok-tenant**: tüm query’lerde `tenant` filtresi; provider config `payment_provider` üzerinden seçilecek.
* **Para birimi/dil**: cevaplarda cents + formatted price (Shopo FE için adapter), `Accept-Language` destek.
* **Stok**: rezervasyon → ödeme başarılıysa commit, aksi halde release; TTL ile otomatik çözülme.

---

# FE (Shopo) ile sözleşme (MVP)

* `POST /api/v1/checkout` → `{ order:{orderNo,status,amount,currency}, payment:{provider,clientSecret} }`
* `GET /api/v1/orders/track/:orderNo` → timeline + özet
* Fiyatlar: cevaba hem **cents** hem **formatlanmış string** vereceğiz (FE değişiklik ihtiyacını en aza indiririz).

---

# Bir sonraki adım (kod yazmadan)

İstersen sırayla şu üç şeyi netleştirelim:

1. **Order alanları & status makinesi** (sende onay)
2. **Checkout endpoint kontratı** (request/response tam payload)
3. **Stripe webhook olay matrisi** (hangi event → hangi state/işlem)

Onaylardan sonra modülleri tek tek kodlamaya geçeriz.
