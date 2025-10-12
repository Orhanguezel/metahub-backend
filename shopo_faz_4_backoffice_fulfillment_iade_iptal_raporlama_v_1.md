# Shopo — Faz 4: Backoffice, Fulfillment, İade/İptal & Raporlama (v1)

> Tarih: 2025-09-28  
> Amaç: Yönetim (admin) tarafında sipariş karşılama (fulfillment), kargo, iade/iptal/refund, stok yönetimi ve raporlama uçlarının tamamlanması.  
> İlke: Çok‑tenant (`X-Tenant`), RBAC, idempotency, değişmez kayıt (audit), FE (katalog) tarafını bozmadan ilerleme.

---

## 1) Roller & RBAC
**Roller:** `admin`, `manager`, `support`, `picker`, `viewer`  
**Kaynaklar:** Orders, Shipments, Returns, Refunds, Inventory, Coupons, Reports

**Örnek izin matrisi**
| Kaynak     | admin | manager | support | picker | viewer |
|------------|:-----:|:-------:|:-------:|:------:|:------:|
| Orders     |  CRUD |  CRUD   |  R/U    |  R/U   |   R    |
| Shipments  |  CRUD |  CRUD   |   R     |  R/U   |   R    |
| Returns    |  CRUD |  CRUD   |  R/U    |   R    |   R    |
| Refunds    |  CRUD |  R/U    |  R/U    |   -    |   R    |
| Inventory  |  CRUD |  R/U    |   R     |   R    |   R    |
| Coupons    |  CRUD |  R/U    |   R     |   -    |   R    |
| Reports    |   R   |   R     |   R     |   -    |   R    |

> Uygulama: JWT payload → `roles[]`, route‑level guard + service‑level assert.

---

## 2) Veri Modelleri (Mongoose)

### 2.1 Shipment & Package
```ts
// models/Shipment.ts
{
  _id: ObjectId,
  tenant: string,
  orderId: ObjectId,
  status: 'ready'|'label_printed'|'shipped'|'delivered'|'lost'|'returned',
  carrier: 'dhl'|'ups'|'fedex'|'local'|string,
  trackingNo?: string,
  packages: [
    {
      packageNo: string,
      items: [{ orderItemId: ObjectId, qty: number }],
      weight_grams?: number,
      dims?: { l: number, w: number, h: number }
    }
  ],
  labelUrl?: string,
  shippedAt?: Date,
  deliveredAt?: Date,
  meta?: any,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 Return (RMA) & Refund
```ts
// models/Return.ts
{
  _id: ObjectId,
  tenant: string,
  orderId: ObjectId,
  orderNo: string,
  userId?: ObjectId,
  status: 'requested'|'authorized'|'in_transit'|'received'|'rejected'|'refunded'|'closed',
  reason?: 'damaged'|'wrong_item'|'not_satisfied'|'other',
  items: [{ orderItemId: ObjectId, qty: number, condition?: 'new'|'opened'|'damaged' }],
  rmaNo: string,
  labels?: [{ url: string, provider: string }],
  receivedAt?: Date,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}

// models/Refund.ts
{
  _id: ObjectId,
  tenant: string,
  orderId: ObjectId,
  orderNo: string,
  paymentProvider: 'stripe'|'iyzico'|'paypal',
  status: 'pending'|'succeeded'|'failed',
  amount_cents: number,
  currency: string,
  reason?: string,
  raw?: any,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.3 Inventory: StockLedger & Adjustment
```ts
// models/StockLedger.ts (muhasebe defteri mantığı)
{
  _id: ObjectId,
  tenant: string,
  productId: ObjectId,
  type: 'purchase'|'sale'|'reserve'|'release'|'return'|'adjustment',
  qty: number,                  // + girer, - çıkar
  refType?: 'order'|'shipment'|'return'|'adjustment'|'po',
  refId?: ObjectId,
  note?: string,
  createdAt: Date
}

// models/InventoryAdjustment.ts
{
  _id: ObjectId,
  tenant: string,
  productId: ObjectId,
  delta: number,                // +10 / -5
  reason?: string,
  createdBy: ObjectId,
  createdAt: Date
}
```

### 2.4 PurchaseOrder (opsiyonel, tedarik)
```ts
// models/PurchaseOrder.ts
{
  _id: ObjectId,
  tenant: string,
  supplierId?: ObjectId,
  status: 'draft'|'ordered'|'received'|'closed',
  items: [{ productId: ObjectId, qty: number, cost_cents: number }],
  total_cents: number,
  currency: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 3) Yönetim Uçları (REST)

### 3.1 Orders (Admin)
- `GET /api/v1/admin/orders?status=&q=&from=&to=&page=&pageSize=`
- `GET /api/v1/admin/orders/:orderNo`
- `POST /api/v1/admin/orders/:orderNo/cancel` *(paid değilse)*
- `POST /api/v1/admin/orders/:orderNo/notes` `{ text }`
- `POST /api/v1/admin/orders/:orderNo/status` `{ to: 'packing'|'shipped'|'delivered' }`

### 3.2 Shipments
- `POST /api/v1/admin/orders/:orderNo/shipments`  
  Body: paket kalemleri, taşıyıcı, ağırlık, dims → **label provider** ile etkileşim (ops.)
- `GET /api/v1/admin/shipments/:id`
- `POST /api/v1/admin/shipments/:id/label` (etiket üret)
- `POST /api/v1/admin/shipments/:id/mark-shipped` `{ trackingNo }`
- `POST /api/v1/admin/shipments/:id/mark-delivered`

### 3.3 Returns (RMA)
- `POST /api/v1/admin/orders/:orderNo/returns`  
  Body: `{ items:[{orderItemId, qty}], reason }` → `status='authorized'`, RMA oluştur + iade etiketi (ops.)
- `GET /api/v1/admin/returns?status=&q=&page=&pageSize=`
- `POST /api/v1/admin/returns/:id/mark-received` (muayene)
- `POST /api/v1/admin/returns/:id/decision` `{ approve: true|false, notes }`

### 3.4 Refunds
- `POST /api/v1/admin/orders/:orderNo/refunds` `{ amount_cents, reason }` → provider API çağrısı  
- `GET /api/v1/admin/refunds?status=&q=&page=&pageSize=`

### 3.5 Inventory
- `GET /api/v1/admin/inventory?productId=&sku=&lowStock=`
- `POST /api/v1/admin/inventory/adjustments` `{ productId, delta, reason }` → **StockLedger** kaydı + `Product.stock` güncelle
- `GET /api/v1/admin/stock-ledger?productId=&from=&to=`

### 3.6 Coupons (opsiyon)
- `POST /api/v1/admin/coupons` / `PATCH /:id` / `DELETE /:id` / `GET /:id` / `GET /`

### 3.7 Reports
- `GET /api/v1/admin/reports/sales?from=&to=&interval=day|week|month`
- `GET /api/v1/admin/reports/products/top?from=&to=&limit=`
- `GET /api/v1/admin/reports/customers/top?from=&to=&limit=`
- `GET /api/v1/admin/reports/finance?from=&to=` (ciro, iade, net)

---

## 4) Fulfillment Akışları

### 4.1 Picking & Packing
1. Order `paid` → **picking list** üret (ürün, raf, adet).  
2. Paketleme: orderItems → packages[].  
3. Shipment oluştur: carrier seçimi, etiket (ops.), trackingNo.  
4. Status: `packing → shipped`.

### 4.2 Kargo Takibi
- Cron/worker ile **carrier API** (ops.) polling → `delivered` güncelle.  
- Webhook varsa carrier’dan dinle.

### 4.3 Kısmi Sevkiyat
- Bir sipariş birden fazla shipment alabilir; her shipment kendi package/items seti ile ilerler.

---

## 5) İade / İptal / Refund Akışı

### 5.1 İptal (kargoya verilmeden önce)
- `awaiting_payment` veya `paid` (packing öncesi) → `cancelled`  
- **Stock:** `paid` iptalse `commit` edilmiş stoklar iade edilir (`stock += qty`).  
- **Refund:** ödeme sağlayıcı üzerinden tam/parsiyel iade.

### 5.2 İade (RMA)
1. Kullanıcı panelinden istek → support/admin inceler → `authorized`.  
2. Kargo etiketi (ops.) ve talimatlar.  
3. Depoya giriş: `received` → muayene → **karar** (`approved|rejected`).  
4. Onaylıysa: ürün duruma göre **restock** ve **refund** (tam/parsiyel).  
5. Red ise: notlandırma + gerekirse geri gönderim.

### 5.3 Refund
- Stripe: `refunds.create({ payment_intent, amount })`  
- Webhook: `charge.refunded` → Refund kaydı `succeeded`  
- Kayıt: Refund model + Order.timeline

---

## 6) Audit & Event Outbox
- **AuditLog**: her kritik değişiklik → `{ who, when, resource, action, before?, after? }`  
- **Outbox**: sipariş/stock/coupon olayları **transactional outbox** ile kuyruğa yazılır; e‑posta, analitik, 3P entegrasyonlara güvenli teslim.

---

## 7) Bildirimler & Belgeler
- **E‑posta**: sipariş alındı, ödeme onayı, kargoya verildi, teslim edildi, iade onayı/red, refund onayı.  
- **PDF**: fatura (invoice), irsaliye, iade formu.  
- Şablonlar: Handlebars/MJML; çok‑dil subject/body; tenant bazlı marka (logo/renk).

---

## 8) Raporlama (Örnek Tanımlar)
- **Satış Özet**: ciro, sipariş adedi, AOV, dönüşüm oranı (ops.).  
- **Ürün Performansı**: adet, ciro, iade oranı.  
- **Stok**: eldeki stok, rezerve, düşük stok uyarıları.  
- **Finans**: tahsilat, iade, net gelir.  
- CSV/Excel export uçları (streaming).

---

## 9) İş Zamanlayıcılar (Cron/Workers)
- `reservation-expiry`: reserved stok TTL dolan **unpaid** siparişlerde release.  
- `shipment-tracking`: kargo takip güncellemesi.  
- `low-stock-alert`: stok eşik altı bildirim.  
- `data-retention`: eski log/outbox temizliği.

---

## 10) Güvenlik & Uygunluk
- Rate limit (admin uçları), IP allowlist (ops.), detaylı audit.  
- PII koruması, log redaksiyonu, konfig ile maskeleme.  
- En az ayrıcalık: servis/tokens.  
- Webhook imza doğrulama.

---

## 11) Örnek Admin İşlemleri (CURL)
```bash
# Siparişi kargoya hazırlama → shipment oluştur
curl -X POST \
  -H 'Authorization: Bearer <ADMIN_JWT>' \
  -H 'X-Tenant: ensotek' \
  -H 'Content-Type: application/json' \
  -d '{
    "carrier":"dhl",
    "packages":[{"packageNo":"PKG-1","items":[{"orderItemId":"...","qty":1}]}]
  }' \
  https://api.example.com/api/v1/admin/orders/MH-2025-000123/shipments

# İade kararı → onay
curl -X POST \
  -H 'Authorization: Bearer <ADMIN_JWT>' \
  -H 'X-Tenant: ensotek' \
  -H 'Content-Type: application/json' \
  -d '{"approve":true,"notes":"Ürün sağlam"}' \
  https://api.example.com/api/v1/admin/returns/RET-abc/decision
```

---

## 12) FE Etkisi (Müşteri tarafı)
Müşteri tarafındaki Shopo temasına **değişiklik gerekmez**. Tracking sayfası ve sipariş geçmişi Faz 3 uçlarını kullanır. Faz 4, **admin panel** (ayrı FE) için API sağlar.

---

## 13) Sonraki Adım
- Admin FE (Next.js/Ensotek UI standardı) için sayfa planı: Orders list/detail, Picking, Shipments, Returns/Refunds, Inventory, Reports.  
- Stripe refund entegrasyonu ve webhook testleri.  
- Stok defteri (StockLedger) görünümleri + CSV export.

