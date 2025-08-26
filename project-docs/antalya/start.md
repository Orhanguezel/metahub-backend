Süper — önce **modül haritasını** netleştirip, ardından **tip/sözleşme** dosyalarını koyalım. Aşağıdaki yapı MetaHub standartlarıyla uyumlu, **multi-tenant** (tüm isteklerde `x-tenant: gzl` zorunlu), i18n anahtarları backend’te tutulur ve tüm yanıtlar `res.status(...).json(...); return;` kalıbıyla döner.

---

# Önerilen Modül Haritası (Restaurant Ordering)

## A) Çekirdek & Lokasyon

1. **branch** (şube)
   – Konum (2dsphere), çalışma saatleri, servis türleri (delivery/pickup/dine-in), minimum hazırlık süresi, şube bazlı fiyat/menü ataması, teslimat bölgeleri (polygon/radius).

> Tüm sorgularda `tenant` filtresi, yakınlık aramalarında `2dsphere` index ve `$near`/polygon kontrolü.&#x20;

2. **contacts** (müşteri/kurumsal) + **addresses** (müşteri adres defteri)
   – Telefon/e-posta index’leri, son siparişler, favori adres. (Mevcut “contacts” standardı ile uyumlu.)&#x20;

3. **files** (logo, ürün görseli, fiş PDF vs.).&#x20;

## B) Menü & Katalog

4. **menucategory**
   – Sıra, görünürlük, i18n ad.

5. **menuitem** (ürün)
   – i18n ad/açıklama, görseller, **variant**(boyut) ve **modifierGroup**(seçenek) bağları, vergi oranı, şube bazlı fiyat opsiyonu.

6. **modifiergroup / modifieritem**
   – Min/Max, zorunlu/opsiyonel, çoklu seçim, fiyat etkisi.

7. **combo** (menü setleri) – birden fazla item + grup kuralları.

8. **availability** (öğe/saat bazlı)
   – “Sadece kahvaltıda”, özel gün istisnaları (rrule veya slot). (Tema/i18n prensipleri korunur. )&#x20;

## C) Sepet & Sipariş

9. **cart** (geçici)
   – Session/user bağlanır; **OrderDraft** olarak da tasarlanabilir.

10. **orders**
    – Kalemler, variant/modifier detayları, servis türü: **delivery/pickup/dine-in**, ücretler (teslimat, servis), bahşiş, kampanya; durum akışı: `pending → confirmed → in_kitchen → ready → out_for_delivery|picked_up → delivered → completed`, iptal/iade.
    – Yan olaylar: `order.created/updated/statusChanged` → bildirimler, KDS ticket üretimi.
    – Şube ve tenant index’leri.

11. **payments** (mevcut modül ile)
    – Kart/Nakit/Online metotlar, iade/partial refund; invoice ile uzlaşma.&#x20;

12. **invoicing** (mevcut)
    – Fiş/fatura üretimi; KDV; “paid/overdue”.&#x20;

## D) Mutfağa Hazırlık & Teslimat

13. **kds** (Kitchen Display System)
    – **kitchenticket**, **station** (sıcak/soğuk/hamurhane vs), hazırlık süreleri, “fire/hold/ready” aksiyonları.

14. **delivery**
    – Kurye ataması, rota, duraklar; **deliveryZone** (polygon) ve ücret kuralı.

## E) Kampanya & Sadakat

15. **coupons** (mevcut yapıyı uyarlayabiliriz), **giftcard**, **loyalty** (puan/defter).

## F) Operasyon & Raporlama

16. **shifts** (vardiya), **timetracking** (mevcut), **expenses** (maliyet), **cashbook** (kasa), **reports** (satış/saat/ürün/kanal).&#x20;

## G) Bildirimler & Ayarlar

17. **notifications** (mevcut) – mail/SMS/WS push;
18. **settings** & **modules meta/setting** – modül bazlı toggles (örn. dine-in açık mı?), SEO alanları **sadece** setting’te.&#x20;

---

# V1 (MVP) – Öncelik Sırası

1. **branch**, **menucategory**, **menuitem** (+variant/modifier)
2. **orders** (+cart → order), **payments**, **invoicing**
3. **deliveryZone/fee**, **customers/addresses**
4. **notifications**, **reports (basic)**

> V2: **kds**, **inventory/recipe (stok düşümü)**, **coupons/loyalty**, **tables/qr dine-in**, **aggregator entegrasyonları**.

---

# Ortak Kurallar (MetaHub ile tam uyum)

* **Tenant çözümleme**: her istekte `x-tenant` zorunlu; domain fallback’leri ve hata sözleşmesi aynı.&#x20;
* **Yanıt standardı**: `res.status(...).json(...); return;` (logging uyumu).&#x20;
* **Test/Runner**: Postman Runner’da header ile tenant, path/body’de **tenant yok**.&#x20;
* **i18n**: backend hata/sistem mesajları modül namespace’inde (6 dil).&#x20;

---

## Minimal Tip/Sözleşme Dosyaları (kopyala-yapıştır)

### `backend/modules/orders/types.ts`

```ts
export type ServiceType = "delivery" | "pickup" | "dinein";
export type OrderChannel = "web" | "mobile" | "kiosk" | "phone";
export type OrderStatus =
  | "pending" | "confirmed" | "in_kitchen" | "ready"
  | "out_for_delivery" | "picked_up" | "delivered" | "completed"
  | "canceled";

export type PaymentStatus = "unpaid" | "authorized" | "paid" | "refunded" | "partially_refunded" | "failed";

export interface Money {
  amount: number;          // TRY default
  currency: "TRY" | "EUR" | "USD";
}

export interface OrderPriceBreakdown {
  items: Money;
  modifiers: Money;
  deliveryFee?: Money;
  serviceFee?: Money;
  tip?: Money;
  discount?: Money;        // total discounts
  tax?: Money;             // if tax separated
  total: Money;
}
```

### `backend/modules/branch/models/branch.model.ts`

```ts
import { Schema, model, Types } from "mongoose";

const DeliveryZoneSchema = new Schema({
  name: { type: String, trim: true },
  // Polygon: [ [ [lng,lat], [lng,lat], ... ] ]
  polygon: { type: { type: String, enum: ["Polygon"], default: "Polygon" }, coordinates: [[[Number]]] },
  fee: { amount: { type: Number, default: 0 }, currency: { type: String, default: "TRY" } },
}, { _id: false });

const BranchSchema = new Schema({
  tenant: { type: String, index: true, required: true },
  code: { type: String, required: true },              // business key
  name: { type: String, required: true },
  location: {                                          // 2dsphere store point
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], index: "2dsphere", required: true } // [lng,lat]
  },
  address: { type: String },
  phone: { type: String },
  services: { type: [String], default: ["delivery","pickup","dinein"] }, // ServiceType[]
  openingHours: [{ day: Number, open: String, close: String }],          // 0-6 (Sun-Sat)
  minPrepMinutes: { type: Number, default: 15 },
  deliveryZones: { type: [DeliveryZoneSchema], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

BranchSchema.index({ tenant: 1, code: 1 }, { unique: true });

export const Branch = model("Branch", BranchSchema);
```

### `backend/modules/menu/models/menuitem.model.ts`

```ts
import { Schema, model, Types } from "mongoose";

const ModifierItemSchema = new Schema({
  code: { type: String, required: true },
  name: { type: Map, of: String, required: true },     // TranslatedLabel
  priceDelta: { amount: { type: Number, default: 0 }, currency: { type: String, default: "TRY" } },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const ModifierGroupSchema = new Schema({
  code: { type: String, required: true },
  name: { type: Map, of: String, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 1 },
  required: { type: Boolean, default: false },
  items: { type: [ModifierItemSchema], default: [] },
}, { _id: false });

const VariantSchema = new Schema({
  code: { type: String, required: true },              // e.g., small/medium/large
  name: { type: Map, of: String, required: true },
  price: { amount: { type: Number, required: true }, currency: { type: String, default: "TRY" } },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const MenuItemSchema = new Schema({
  tenant: { type: String, index: true, required: true },
  code: { type: String, required: true },
  categoryId: { type: Types.ObjectId, required: true, ref: "MenuCategory" },
  name: { type: Map, of: String, required: true },     // TranslatedLabel
  description: { type: Map, of: String },
  imageUrl: { type: String },
  variants: { type: [VariantSchema], default: [] },
  modifierGroups: { type: [ModifierGroupSchema], default: [] },
  taxRate: { type: Number, default: 0 },               // % KDV
  perBranchPricing: [{
    branchId: { type: Types.ObjectId, ref: "Branch", required: true },
    variantCode: { type: String, required: true },
    price: { amount: { type: Number, required: true }, currency: { type: String, default: "TRY" } },
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

MenuItemSchema.index({ tenant: 1, code: 1 }, { unique: true });
MenuItemSchema.index({ tenant: 1, categoryId: 1, isActive: 1 });

export const MenuItem = model("MenuItem", MenuItemSchema);
```

### `backend/modules/orders/models/order.model.ts`

```ts
import { Schema, model, Types } from "mongoose";

const OrderModifierSchema = new Schema({
  groupCode: String,
  itemCode: String,
  name: { type: Map, of: String },                     // snapshot
  priceDelta: { amount: Number, currency: String },
}, { _id: false });

const OrderItemSchema = new Schema({
  menuItemId: { type: Types.ObjectId, ref: "MenuItem", required: true },
  code: String,                                        // snapshot
  name: { type: Map, of: String, required: true },     // snapshot
  variantCode: String,
  variantName: { type: Map, of: String },
  unitPrice: { amount: Number, currency: String },
  quantity: { type: Number, default: 1 },
  modifiers: { type: [OrderModifierSchema], default: [] },
  lineTotal: { amount: Number, currency: String },
}, { _id: false });

const PriceSchema = new Schema({
  items: { amount: Number, currency: String },
  modifiers: { amount: Number, currency: String },
  deliveryFee: { amount: Number, currency: String },
  serviceFee: { amount: Number, currency: String },
  tip: { amount: Number, currency: String },
  discount: { amount: Number, currency: String },
  tax: { amount: Number, currency: String },
  total: { amount: Number, currency: String, required: true },
}, { _id: false });

const DeliveryInfoSchema = new Schema({
  addressId: { type: Types.ObjectId, ref: "Address" },
  addressText: String,                                 // snapshot
  geo: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
  zoneName: String, zoneFee: { amount: Number, currency: String },
}, { _id: false });

const PickupInfoSchema = new Schema({
  scheduledAt: Date,
}, { _id: false });

const DineInInfoSchema = new Schema({
  tableCode: String,
  qrToken: String,
  guests: Number,
}, { _id: false });

const OrderSchema = new Schema({
  tenant: { type: String, required: true, index: true },
  branchId: { type: Types.ObjectId, ref: "Branch", required: true, index: true },
  customerId: { type: Types.ObjectId, ref: "Contact" },
  channel: { type: String, enum: ["web","mobile","kiosk","phone"], default: "web" },
  serviceType: { type: String, enum: ["delivery","pickup","dinein"], required: true },
  status: { type: String, enum: ["pending","confirmed","in_kitchen","ready","out_for_delivery","picked_up","delivered","completed","canceled"], default: "pending", index: true },
  items: { type: [OrderItemSchema], default: [] },
  prices: PriceSchema,
  paymentStatus: { type: String, enum: ["unpaid","authorized","paid","refunded","partially_refunded","failed"], default: "unpaid", index: true },
  delivery: DeliveryInfoSchema,
  pickup: PickupInfoSchema,
  dinein: DineInInfoSchema,
  notes: String,
  // link to external modules
  invoiceId: { type: Types.ObjectId, ref: "Invoice" },
  payments: [{ type: Types.ObjectId, ref: "Payment" }],
}, { timestamps: true });

OrderSchema.index({ tenant: 1, createdAt: -1 });
OrderSchema.index({ tenant: 1, status: 1, branchId: 1, createdAt: -1 });

export const Order = model("Order", OrderSchema);
```

### `backend/modules/orders/controllers/order.controller.ts`

```ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import { Order } from "../models/order.model";
import { Branch } from "@/modules/branch/models/branch.model";

/** Create Order (MVP) */
export const createOrder = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const tenant = (req as any).tenant as string;              // resolveTenant middleware
  const { branchId, serviceType, items, prices, delivery, pickup, dinein } = req.body || {};

  // Basic validations
  if (!tenant) { res.status(400).json({ success: false, message: "tenant.required" }); return; }
  if (!isValidObjectId(branchId)) { res.status(422).json({ success: false, message: "order.branch.invalid" }); return; }
  if (!["delivery","pickup","dinein"].includes(serviceType)) { res.status(422).json({ success: false, message: "order.serviceType.invalid" }); return; }
  if (!Array.isArray(items) || items.length === 0) { res.status(422).json({ success: false, message: "order.items.required" }); return; }

  // Ensure branch belongs to tenant
  const branch = await Branch.findOne({ _id: branchId, tenant, isActive: true }).lean();
  if (!branch) { res.status(404).json({ success: false, message: "branch.notFound" }); return; }

  // Delivery requirements
  if (serviceType === "delivery") {
    if (!delivery?.addressText) { res.status(422).json({ success: false, message: "order.delivery.address.required" }); return; }
    // TODO: polygon/zone inclusion + fee enrichment
  }

  // Pickup lead time check (MVP: only existence)
  if (serviceType === "pickup" && pickup?.scheduledAt && isNaN(Date.parse(pickup.scheduledAt))) {
    res.status(422).json({ success: false, message: "order.pickup.datetime.invalid" }); return;
  }

  const doc = await Order.create({ tenant, branchId, serviceType, items, prices, delivery, pickup, dinein, status: "pending", paymentStatus: "unpaid" });
  res.status(201).json({ success: true, data: doc });
  return;
});

/** List Orders (admin) */
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const { page = 1, limit = 20, status, branchId } = req.query as any;

  const q: any = { tenant };
  if (status) q.status = status;
  if (branchId && isValidObjectId(branchId)) q.branchId = branchId;

  const cursor = Order.find(q).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit);
  const [items, total] = await Promise.all([cursor.lean(), Order.countDocuments(q)]);
  res.status(200).json({ success: true, data: items, meta: { page: +page, limit: +limit, total } });
  return;
});

/** Update Status (kitchen/progress) */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const tenant = (req as any).tenant as string;
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = ["confirmed","in_kitchen","ready","out_for_delivery","picked_up","delivered","completed","canceled"];
  if (!allowed.includes(status)) { res.status(422).json({ success: false, message: "order.status.invalid" }); return; }

  const doc = await Order.findOneAndUpdate({ _id: id, tenant }, { $set: { status } }, { new: true });
  if (!doc) { res.status(404).json({ success: false, message: "order.notFound" }); return; }

  res.status(200).json({ success: true, data: doc });
  return;
});
```

### `backend/modules/orders/routes/order.routes.ts`

```ts
import { Router } from "express";
import { createOrder, listOrders, updateOrderStatus } from "../controllers/order.controller";

const r = Router();
// All routes expect resolveTenant middleware applied globally
r.post("/orders", createOrder);          // public checkout (auth opsiyonel)
r.get("/orders/admin", listOrders);      // admin list
r.patch("/orders/:id/status", updateOrderStatus); // admin/kitchen actions
export default r;
```

> Not: Tüm controller/route’larda **`x-tenant` header zorunlu**; response kalıbı **tek tip**.&#x20;

---

## Doğrulama Kuralları (kritik)

* **ServiceType** → delivery: adres/zone gerekli; pickup: zaman aralığı şube saatleri + hazırlık süresiyle uyumlu; dine-in: table/qrToken doğrulaması.
* **Para birimi**: default **TRY**, Money şemasıyla tutarlılık.
* **Kimlikler**: `ObjectId` doğrulaması, şubenin `tenant`’a ait olduğu kontrolü.
* **Sayfalama**: tüm liste uçlarında `limit=20`, sıralama `createdAt:desc`.
* **Index’ler**: `(tenant, code)` unique’leri, `2dsphere` (branch.location, teslimat polygon), `(tenant, status, branchId, createdAt)` siparişler.

---

## Populate Reçeteleri (örnekler)

* **Order detail (admin)**:
  `branchId(name,location), customerId(contactName,phone,email), payments(amount,date,method)`
* **Menu item (public)**:
  `categoryId(name)`, (opsiyonel) `perBranchPricing.branchId(name)`

---

## Test Aklı (MVP için 2 örnek)

**1) Sipariş oluştur (happy path)**

* `POST /orders` → body: branchId + items(1 adet) + serviceType=pickup + prices.total
* Beklenti: **201**, `success:true`, `status:"pending"`.

**2) Geçersiz şube (validation)**

* `POST /orders` → geçersiz `branchId`
* Beklenti: **422** `order.branch.invalid`.

> Postman Runner’da her istekte `x-tenant: gzl` var, path/body’de **tenant yok**.&#x20;

---

## Sonraki Adım Önerim

* İstersen en önce **branch** + **menuitem** CRUD uçlarını aynı şablonda açalım (admin list/detail/create/update/delete), ardından **createOrder**’ı gerçek fiyat hesaplayıcıyla (variant/modifier toplamı + vergi + zone fee) tamamlayalım.
* Paralelde **payments/invoicing** bağlarını mevcut modüllere iliştiririz (status akışı → invoice/paid).&#x20;

İstersen “branch” ve “menuitem” için **tam CRUD controller + route** dosyalarını da hemen çıkarayım; buna ek olarak **teslimat polygon kontrolü** (point-in-polygon) ve **pickup slot doğrulaması** helper’larını yazayım.
