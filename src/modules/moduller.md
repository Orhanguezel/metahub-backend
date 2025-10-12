süper — elimizdeki router çıktısına göre (mevcut modüller) ile “Faz 4” kapsamını tek tek eşledim. Aşağıda **ne hazır**, **ne kısmen var**, **ne eksik** çok net bir tabloyla görebilirsin.

# Özete hızlı bakış

* **Sipariş/ödeme/iade/stok** tarafında temel taşların çoğu mevcut.
* **Kritik eksikler**: Shipment (kargo sevkiyat) modülü, ayrı Refund modeli+admin akışları, Fulfillment (picking/packing) uçları, Audit & Outbox, (ops.) PurchaseOrder.
* **Kısmi**: Returns (RMA) var; karar/refund entegrasyonu ve depoya giriş (received) sonrası stok & ödeme eşlemesi tamamlanmalı. Inventory güçlü ama “Adjustment” için net bir admin akışı eklemek faydalı. Scheduling var; ama shipment-tracking/low-stock cronları tanımlı görünmüyor.

# Kapsam eşleme tablosu

| Faz-4 Bileşeni                                                              | Mevcut Modül(ler)                           | Durum                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RBAC roller (`admin, manager, support, picker, viewer`)**                 | `authlite`, `users`                         | 🟧 Kısmi – route guard var; fakat Faz-4’deki rol setine göre izin matrisi/seed ve bazı admin router’larda `authorizeRoles(...)` genişletmesi gerekiyor.                                     |
| **Orders (Admin) – liste/detay/status/iptal/nota ekleme**                   | `order`                                     | 🟧 Kısmi – modül var, ama Faz-4 admin uçları (packing/shipped/delivered transition, cancel, notes) listede görünmüyor.                                                                      |
| **Shipments & Packages**                                                    | —                                           | ❌ Eksik – `shipments` modülü, model + admin uçları (label, mark-shipped, mark-delivered, çoklu paket) yok.                                                                                  |
| **Returns (RMA)**                                                           | `returns`                                   | 🟧 Kısmi – RMA modeli/endpointler var. “received→approved/rejected→refund” akışında **refund tetikleme & stok iadesi** ve **kargo etiketi** (ops.) eksik.                                   |
| **Refunds (ayrı model + admin liste/filtre)**                               | `payments`                                  | ❌ Eksik – Provider refund endpoint’i var; fakat **Refund** dokümanı ve admin listesi/filtreleri ayrık bir modül olarak yok.                                                                 |
| **Inventory (StockLedger & Adjustment)**                                    | `inventory`, `stockledger`, `stockmovement` | 🟧 Kısmi – Ledger/Inventory mevcut. Admin “adjustments” (delta+reason) için net uç; low-stock feed; rebuild var. Picker/packing ile rezervasyon/serbest bırakma bağları gözden geçirilmeli. |
| **Shipping methods / quote**                                                | `shipping`                                  | ✅ Var – public quote & method list çalışıyor.                                                                                                                                               |
| **Coupons**                                                                 | `coupon`                                    | ✅ Var – ama yönetim uçlarının kapsayıcılığı kontrol edilmeli.                                                                                                                               |
| **Reports (sales/products/customers/finance)**                              | `reports`, `analytics`                      | 🟧 Kısmi – modüller var; Faz-4’deki spesifik endpoint seti (parametreler/aggregation) doğrulanmalı.                                                                                         |
| **PurchaseOrder (opsiyonel)**                                               | —                                           | ❌ Eksik.                                                                                                                                                                                    |
| **Audit Log**                                                               | —                                           | ❌ Eksik – kritik admin işlemlere audit trail eklenmeli.                                                                                                                                     |
| **Event Outbox (transactional)**                                            | `payments` (webhooks), `notification`       | 🟧 Kısmi – payments webhooks var; **genel outbox** katmanı yok.                                                                                                                             |
| **Notifications & PDF**                                                     | `email`, `invoicing`, `notification`        | 🟧 Kısmi – e-posta/pfd şablonları tenant/dil bazlı tamamlanmalı.                                                                                                                            |
| **Schedulers (reservation-expiry, shipment-tracking, low-stock, cleanups)** | `scheduling`                                | 🟧 Kısmi – cron job’ların tanımları/handler’ları görünmüyor.                                                                                                                                |
| **Media**                                                                   | `media`                                     | ✅ Var – Cloudinary entegre.                                                                                                                                                                 |
| **Giftcard**                                                                | `giftcard`                                  | ✅ Var.                                                                                                                                                                                      |
| **Loyalty**                                                                 | `loyalty`                                   | ✅ Var.                                                                                                                                                                                      |
| **Storefront settings**                                                     | `storefront`                                | ✅ Var.                                                                                                                                                                                      |
| **Tax**                                                                     | `tax`                                       | ✅ Var – address based rate resolve/inclusive hesapları hazır.                                                                                                                               |

# P0 öncelikli yapılacaklar (v1 kapanışı)

1. **Shipments modülü (Yeni)**

   * Model: `Shipment` (status: `ready|label_printed|shipped|delivered|lost|returned`, `packages[]`, `carrier`, `trackingNo`, `labelUrl`).
   * Admin routes:

     * `POST /admin/orders/:orderNo/shipments` (packages+carrier)
     * `POST /admin/shipments/:id/label` (ops.)
     * `POST /admin/shipments/:id/mark-shipped` `{ trackingNo }`
     * `POST /admin/shipments/:id/mark-delivered`
   * **Stok & Order entegrasyonu**: shipment oluştururken “rezerve → sevk” aktarımı, kısmi sevkiyata destek.
   * (Ops.) Carrier webhook/polling.

2. **Refunds modülü (Yeni)**

   * Model: `Refund` (tenant, orderId, orderNo, provider, status, amount_cents, currency, reason, raw).
   * Admin routes:

     * `POST /admin/orders/:orderNo/refunds` → provider refund API + Refund kaydı
     * `GET /admin/refunds?status=&q=&from=&to=&page=...`
   * **Payments entegrasyonu**: provider webhooklarında Refund status güncelle (succeeded/failed).

3. **Orders Admin uçları (Genişletme)**

   * `GET /admin/orders` (filtreler) / `GET /admin/orders/:orderNo`
   * `POST /admin/orders/:orderNo/cancel` (packing öncesi) → stok/ödemeyle entegre
   * `POST /admin/orders/:orderNo/status` (packing→shipped→delivered)
   * `POST /admin/orders/:orderNo/notes`

4. **Returns–Refund–Inventory bağlama (Tamamlama)**

   * `returns` akışında `received` → `approved` ise:

     * stok iadesi (ledger: `return/+in`)
     * *gerekliyse* otomatik/parsiyel **refund** tetikleme
   * `rejected` ise timeline notu ve (ops.) geri gönderim.

5. **RBAC rol seti ve guard’lar**

   * JWT `roles[]` → Faz-4 rol seti
   * Admin router’lara `authorizeRoles("admin","manager","support","picker","viewer")` uygun dağılım.
   * (Ops.) seed script.

# P1 (kısa vadede)

* **Inventory Adjustment (admin)**: `POST /admin/inventory/adjustments` `{ productId, delta, reason }` → StockLedger + Inventory sync.
* **Reports**: satış/ürün/müşteri/finans endpoint’lerinin parametre ve aggregationlarının netleştirilmesi; CSV export.
* **Schedulers**: `reservation-expiry`, `shipment-tracking`, `low-stock-alert`, `data-retention`.
* **Audit**: ortak `AuditLog` şeması ve helper (`audit.log(req, {resource, action, before, after})`).
* **Outbox**: genel domain event outbox + publisher (şu an payments/webhooks’ta lokal var, genelleştir).

# Router entegrasyonu (senin dinamik loader ile)

Yeni modüller eklendiğinde aşağıdaki dosyalarla otomatik mount olacak:

* `src/modules/shipments/index.ts` → `/shipments`
* `src/modules/refunds/index.ts` → `/refunds`
* `src/modules/orders/admin.routes.ts` genişletmeleri → `src/modules/orders/index.ts` altında `/orders/admin`

> Not: mevcut `payments` ve `returns` ile **provider refund** + **RMA** akışlarını bağlamak için küçük köprüler gerekecek (event publish veya doğrudan servis çağrısı). Bunu da outbox gelene kadar “in-process” servisle çözebiliriz.

---

İstersen, **Shipments** ve **Refunds** için direkt üretim hazır dosya iskeletlerini de şimdi bırakabilirim; ama önce bu gap listesi üstünden “P0”ları onayla — ona göre kodları ekleyeyim.


harika — Shipment modülünü “bitene kadar” adım adım götürelim. Aşağıdaki sıra, her adım sonunda derlenip çalışır halde kalacak şekilde düzenlendi. Sen “OK” deyince 1. adımdan başlayıp tek tek uygularım.

# Shipment modülü uygulama sırası (onay akışıyla)

1. **Şema & Tipler (P0 çekirdek)**

   * Dosyalar:

     * `src/modules/shipments/types.ts`
     * `src/modules/shipments/models.ts`
   * İçerik:

     * `ShipmentStatus = 'ready'|'label_printed'|'shipped'|'delivered'|'lost'|'returned'`
     * `IShipment` (tenant, order, carrier, trackingNo?, packages[], labelUrl?, timestamps)
     * `packages[].items[]` = `{ orderItemId: ObjectId; qty: number }`
   * İndeksler: `{ tenant, order }`, `{ tenant, status, createdAt }`.

2. **Validation & RBAC kapısı**

   * Dosyalar:

     * `src/modules/shipments/validation.ts`
   * İçerik:

     * `createShipment` body validator (carrier, packages[].items[].qty > 0 vs.)
     * `id/tenant` objectId validasyonları
   * RBAC: admin router’da `authenticate + authorizeRoles('admin','manager','support','picker','viewer')`; yazma işlemlerinde `'admin','manager','picker'`.

3. **Service katmanı (iş kuralları, stok & sipariş bağları)**

   * Dosyalar:

     * `src/modules/shipments/service.ts`
   * İçerik (idempotent by design):

     * `createShipmentForOrder(orderNo, payload)` → Order kontrolü, paket kalemlerinin sipariş kalemleriyle eşleşmesi, **kısmi sevkiyat** desteği.
     * `markLabelPrinted(shipmentId, labelUrl?)`
     * `markShipped(shipmentId, trackingNo)` → **StockLedger**: `type='out'` ile hareket; aynı shipment için tekrarlı çağrıda no-op.
     * `markDelivered(shipmentId)` → sipariş item’larında delivered qty snapshot (opsiyonel).
     * `cancelIfReady(shipmentId)` → sadece `ready|label_printed` durumunda; (ops.) rezerve bırakma/serbest bırakma kuralları.

4. **Admin Controller’lar**

   * Dosyalar:

     * `src/modules/shipments/admin.controller.ts`
   * Uçlar:

     * `POST /admin/orders/:orderNo/shipments` (create)
     * `GET /admin/shipments/:id` (detail)
     * `GET /admin/shipments` (q, status, carrier, from/to, page/limit)
     * `POST /admin/shipments/:id/label` (label_printed + labelUrl)
     * `POST /admin/shipments/:id/mark-shipped` `{ trackingNo }`
     * `POST /admin/shipments/:id/mark-delivered`
     * `DELETE /admin/shipments/:id` (sadece `ready|label_printed`)
   * Tümünde tenant filtresi.

5. **Admin Routes**

   * Dosyalar:

     * `src/modules/shipments/admin.routes.ts`
   * İçerik:

     * Guard, validation middleware zinciri, controller bağları.

6. **Public (opsiyonel P0.5)**

   * Dosyalar:

     * `src/modules/shipments/public.controller.ts`
     * `src/modules/shipments/public.routes.ts`
   * Uçlar:

     * `GET /public/shipments/track/:trackingNo` → temel durum/özet (tenant + trackingNo).
   * (İleride carrier API webhooks/polling eklenecekse buraya köprü bırakırız.)

7. **Payments/Orders entegrasyon noktaları**

   * Dosyalar:

     * Değişiklik: `src/modules/order/...` (varsa) → shipment oluşturulduğunda order timeline’a event push (opsiyonel)
     * Değişiklik: `src/modules/stockledger` kullanarak `markShipped` içinde `out` hareketi oluşturma.
   * Not: Stok rezervasyon akışınız nerede yapılıyorsa (order placed/paid) ona göre “reserve→out” geçişini servis’te netleştiririz.

8. **Webhook Outbox (opsiyonel P1)**

   * Dosyalar:

     * `src/modules/shipments/events.ts`
   * Olaylar:

     * `shipment.created`, `shipment.shipped`, `shipment.delivered`
   * Var olan `webhooks/dispatcher.service` ile publish (tenant bazlı).

9. **Carrier entegrasyonu (opsiyonel P1)**

   * Dosyalar:

     * `src/modules/shipments/carriers/index.ts` (adapter interface)
     * `src/modules/shipments/carriers/dhl.ts` (mock/skeleton)
   * Uç:

     * `POST /admin/shipments/:id/label` → adapter ile label & trackingNo döndürebilir.

10. **Router mount**

    * Dosyalar:

      * `src/modules/shipments/index.ts`
    * İçerik:

      * `router.use('/admin', adminRoutes);`
      * `router.use('/public', publicRoutes);` (varsa)
    * Sizin dinamik loader otomatik mount edecek: `/shipments/...`

11. **Postman koleksiyonu (P0)**

    * Koleksiyon: `Shopo – Shipments (Admin)`
    * Senaryolar:

      * Create shipment (orderNo ile)
      * Mark label printed
      * Mark shipped (tracking)
      * Mark delivered
      * Get/list filtresi
      * Negative cases (invalid itemIndex/qty > ordered, wrong status transitions)
    * Ortak env değişkenleri: `{{base_url}}`, `{{tenant_slug}}`, `{{token}}`, `{{order_no}}`, `{{shipment_id}}`, `{{tracking_no}}`

12. **Kısa dokümantasyon (README)**

    * Model şeması
    * Durum makinesi
    * İdempotensi kuralları
    * Entegrasyon noktaları

---

## Notlar / Varsayımlar

* **Kısmi sevkiyat**: `packages[].items[].qty` sipariş kalem toplamının altında/üstünde validasyon yapacağız. Aynı orderItem için birden fazla shipment oluşmasına izin verilecek.
* **Stok**: `markShipped` anında **definitive out**. (Rezervasyon modeliniz varsa: “reserve→out”; yoksa doğrudan “out”.)
* **İdempotensi**: `markShipped` aynı shipment için tekrar çağrılırsa (aynı trackingNo ile) no-op + 200 döner.
* **Multi-tenant**: tüm sorgular `{ tenant: req.tenant }` ile bağlanır; `getTenantModels` üzerinden modeller alınır.

---

Hazırsan “OK” yaz; **Adım 1 (şema & tipler)** ile başlayayım.



Önerilen çalışma sırası

Orders Admin genişletmeleri (status/cancel/notes + timeline).

Returns–Refund–Inventory bağlama (onayda restock ve refund).

Inventory Adjustment admin ucu (hızlı kazanım).

Audit & Outbox (temel altlık).

Schedulers.

Reports (aggregation’lar netleştirme).

(ops.) PurchaseOrder.

“Orders Admin” ile başlayalım mı? İstersen uçların dosya iskeletini ve Postman koleksiyonunu çıkarayım.

