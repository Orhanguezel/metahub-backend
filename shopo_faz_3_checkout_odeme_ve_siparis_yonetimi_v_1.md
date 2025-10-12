# Shopo — Faz 3: Checkout, Ödeme ve Sipariş Yönetimi (v1)

> Tarih: 2025-09-28  
> Amaç: **Temayı hiç bozmadan** (Shopo FE) checkout → ödeme → sipariş akışını Metahub (Node.js + Express + MongoDB) üzerinde tamamlamak.  
> İlke: Çok-tenant (`X-Tenant`), dil (`Accept-Language`), fiyat string adapter (cents→"$12.34"), **idempotency** ve **stok rezervasyonu**.

---

## 1) Kapsam
- **Checkout API**: sepeti sipariş taslağına çevir, ödeme başlat.  
- **Ödeme Entegrasyonu**: Stripe (örnek) + webhook işleyicisi.  
- **Sipariş**: durum makinesi, stok rezervasyonu, iade/iptal kancaları.  
- **Adres Defteri**: `/me/addresses` uçları (checkout’ta kullanmak için).  
- **Tracking**: FE’deki **TrackingOrder** sayfasını dolduracak uç.

---

## 2) Veri Modelleri (Mongoose)

### 2.1 Address (User Address Book)
```ts
// models/Address.ts
{
  _id: ObjectId,
  tenant: string,
  userId: ObjectId,
  fullName: string,
  line1: string,
  line2?: string,
  city: string,
  state?: string,
  zip: string,
  country: string,
  phone?: string,
  isDefault?: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2 OrderItem (Snapshot)
```ts
{
  _id: ObjectId,
  productId: ObjectId,
  title: string,        // snapshot
  image: string,        // dosya adı
  sku?: string,
  variantId?: string,
  attributes?: { [k: string]: string },
  qty: number,
  price_cents: number,
  offer_price_cents?: number,
  currency: string,
  line_total_cents: number // (offer||price)*qty
}
```

### 2.3 Payment (embedded)
```ts
{
  provider: 'stripe'|'iyzico'|'paypal',
  intentId?: string,       // Stripe PaymentIntent id
  method?: string,         // card, banka, ...
  status: 'requires_payment'|'requires_action'|'processing'|'paid'|'failed'|'refunded'|'partial_refunded',
  currency: string,
  amount_cents: number,
  raw?: any                // provider payload snapshot
}
```

### 2.4 Shipment (opsiyonel, v1 basit)
```ts
{
  method: 'standard'|'express',
  carrier?: string,
  trackingNo?: string,
  cost_cents: number,
  address: AddressSnapshot
}
```

### 2.5 AddressSnapshot (Order içine gömülü)
```ts
{
  fullName: string,
  line1: string,
  line2?: string,
  city: string,
  state?: string,
  zip: string,
  country: string,
  phone?: string
}
```

### 2.6 CouponSnapshot (Order içine gömülü)
```ts
{ code: string, type: 'percent'|'fixed'|'free_shipping', value: number, maxDiscount_cents?: number }
```

### 2.7 Order
```ts
// models/Order.ts
{
  _id: ObjectId,
  orderNo: string,            // MH-2025-000123
  tenant: string,
  userId?: ObjectId,

  items: [OrderItem],
  amount_cents: number,
  currency: string,
  subtotal_cents: number,
  discount_cents: number,
  shipping_cents: number,
  tax_cents: number,

  coupon?: CouponSnapshot,
  shipping?: Shipment,
  billingAddress: AddressSnapshot,
  shippingAddress: AddressSnapshot,

  status: 'created'|'awaiting_payment'|'paid'|'packing'|'shipped'|'delivered'|'cancelled'|'returned'|'refunded',
  payment: Payment,

  reservedUntil?: Date,       // stok rezervasyon TTL
  timeline: [{ at: Date, by?: string, ev: string, meta?: any }],
  notes?: string,

  createdAt: Date,
  updatedAt: Date
}
```

### 2.8 Ürün Stok Alanları (güncelleme önerisi)
```ts
// models/Product.ts ek alanlar
{
  stock: number,               // eldeki stok
  reserved_stock: number,      // rezerve edilmiş (ödenmemiş) miktar
  // available = stock - reserved_stock
}
```

---

## 3) Süreçler & Durum Makinesi

1) **Checkout (taslak)**: Cart → Order(`created`), **stok rezervasyonu**: `reserved_stock += qty`.  
2) **Ödeme başlat**: Order → `awaiting_payment` + PaymentIntent oluştur (Stripe).  
3) **Ödeme sonucu**:
   - Başarılı → Order `paid`, `reserved_stock` → gerçek stok düşümü: `stock -= qty; reserved_stock -= qty`.  
   - Başarısız/iptal → rezervasyon bırakılır; TTL dolunca rezervasyon çözülür (`reserved_stock -= qty`).
4) **Kargo**: `packing` → `shipped` (tracking) → `delivered`.  
5) **İade/İptal**: `cancelled` (gönderim öncesi) / `returned` (teslim sonrası) / `refunded`.

**Geçiş kuralları (örnek):**
- `created → awaiting_payment → paid → packing → shipped → delivered`
- `awaiting_payment → cancelled` (timeout/idempotent cancel)
- `paid → refunded` (tam/parsiyel)

---

## 4) Checkout API (REST)

### 4.1 POST `/api/v1/checkout`
**Amaç**: geçerli cart’tan sipariş taslağı ve ödeme intent’i oluştur.  
**Headers**: `X-Tenant`, `Authorization?`, `Cookie: sid?`  
**Body**:
```json
{
  "shippingAddress": {"fullName":"John Doe","line1":"Main 1","city":"Berlin","zip":"10115","country":"DE"},
  "billingAddress": {"fullName":"John Doe","line1":"Main 1","city":"Berlin","zip":"10115","country":"DE"},
  "shippingMethod": "standard",
  "notes": "Kapıya bırakın"
}
```
**Cevap** (Stripe Payment Element akışı):
```json
{
  "order": {"orderNo":"MH-2025-000123","status":"awaiting_payment","amount": 3372, "currency":"USD"},
  "payment": {"provider":"stripe","clientSecret":"pi_..._secret_..."}
}
```

### 4.2 POST `/api/v1/checkout/confirm`
**Amaç**: (Bazı sağlayıcılarda) client token’ı ile son onay (Stripe’ta çoğu kez gerekmez; webhook yeter).  
**Body**: `{ "orderNo": "MH-2025-000123" }`  
**Cevap**: `{ "order": { ...güncel durum... } }`

### 4.3 Webhook — `POST /api/v1/webhooks/stripe`
- **Doğrulama**: `Stripe-Signature` ile imza.  
- **Olaylar**: `payment_intent.succeeded|payment_intent.payment_failed|charge.refunded` …  
- **Akış**: intentId → order bul → `paid`/`failed` durumuna çek → stokları güncelle → timeline kaydet.

---

## 5) Idempotency & Rezervasyon
- **Idempotency-Key**: `POST /checkout` çağrılarında header kullan (örn. `Idempotency-Key: userId|cartHash`). Aynı key ile tekrar çağrılırsa **aynı order** döndürülür.  
- **Rezervasyon TTL**: `reservedUntil = now+15m` → cron/worker, süresi dolan taslaklarda `reserved_stock` iadesi.  
- **Çift işlem engeli**: webhook ve UI onay yarışları için **order lock** (findOneAndUpdate koşullu) + `payment.status` kontrolü.

---

## 6) Örnek Uygulama (Kod Taslakları)

### 6.1 utils/orderNo.ts
```ts
export function generateOrderNo(date = new Date()) {
  // MH-YYYY-xxxxx (zerofill)
  const year = date.getFullYear();
  const rnd = Math.floor(Math.random()*99999).toString().padStart(5,'0');
  return `MH-${year}-${rnd}`;
}
```

### 6.2 services/stock.ts
```ts
import Product from '../models/Product';

export async function reserveStock(items: {productId:string, qty:number}[]) {
  for (const it of items) {
    const p = await Product.findOne({ _id: it.productId });
    if (!p || (p.stock - p.reserved_stock) < it.qty) throw new Error('OUT_OF_STOCK');
    await Product.updateOne({ _id: it.productId, reserved_stock: p.reserved_stock }, {
      $inc: { reserved_stock: it.qty }
    });
  }
}

export async function commitStock(items: {productId:string, qty:number}[]) {
  for (const it of items) {
    await Product.updateOne({ _id: it.productId }, {
      $inc: { stock: -it.qty, reserved_stock: -it.qty }
    });
  }
}

export async function releaseStock(items: {productId:string, qty:number}[]) {
  for (const it of items) {
    await Product.updateOne({ _id: it.productId }, { $inc: { reserved_stock: -it.qty } });
  }
}
```

### 6.3 services/checkout.ts
```ts
import Cart from '../models/Cart';
import Order from '../models/Order';
import { generateOrderNo } from '../utils/orderNo';
import { calcCart } from './cartPricing';
import { reserveStock } from './stock';
import { stripe } from './stripe';

export async function createOrderFromCart({ tenant, userId, sessionId, addresses, shippingMethod, currency, locale }) {
  const cart = await Cart.findOne({ tenant, ...(userId?{userId}:{sessionId}) });
  if (!cart || cart.items.length === 0) throw new Error('CART_EMPTY');
  calcCart(cart);
  const orderNo = generateOrderNo();

  // stok rezervasyonu
  await reserveStock(cart.items.map(it => ({ productId: it.productId, qty: it.qty })));

  const order = await Order.create({
    orderNo,
    tenant,
    userId,
    items: cart.items.map(it => ({
      productId: it.productId,
      title: it.title,
      image: it.image,
      sku: it.sku,
      variantId: it.variantId,
      attributes: it.attributes,
      qty: it.qty,
      price_cents: it.price_cents,
      offer_price_cents: it.offer_price_cents,
      currency: it.currency,
      line_total_cents: (it.offer_price_cents ?? it.price_cents) * it.qty
    })),
    amount_cents: cart.pricing.total_cents,
    currency,
    subtotal_cents: cart.pricing.subtotal_cents,
    discount_cents: cart.pricing.discount_cents,
    shipping_cents: cart.pricing.shipping_cents,
    tax_cents: cart.pricing.tax_cents,
    coupon: cart.coupon ? { ...cart.coupon } : undefined,
    shipping: {
      method: shippingMethod || 'standard',
      cost_cents: cart.pricing.shipping_cents,
      address: addresses.shipping
    },
    billingAddress: addresses.billing,
    shippingAddress: addresses.shipping,
    status: 'awaiting_payment',
    payment: { provider: 'stripe', status: 'requires_payment', currency, amount_cents: cart.pricing.total_cents },
    reservedUntil: new Date(Date.now()+15*60*1000),
    timeline: [{ at: new Date(), ev: 'ORDER_CREATED' }]
  });

  // Stripe PaymentIntent
  const intent = await stripe.paymentIntents.create({
    amount: order.amount_cents,
    currency: order.currency.toLowerCase(),
    metadata: { orderNo: order.orderNo, tenant },
    automatic_payment_methods: { enabled: true },
  });
  order.payment.intentId = intent.id;
  await order.save();

  return { order, clientSecret: intent.client_secret };
}
```

### 6.4 services/stripe.ts
```ts
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET!, { apiVersion: '2025-08-27.basil' as any });
```

### 6.5 routes/checkout.ts
```ts
import { Router } from 'express';
import { env } from '../config/env';
import { createOrderFromCart } from '../services/checkout';
import { toShopoPrice } from '../services/formatters';

const r = Router();

r.post('/', async (req, res, next) => {
  try {
    const tenant = req.tenant!; const currency = env.DEFAULT_CURRENCY; const locale = req.locale!;
    const addresses = { shipping: req.body.shippingAddress, billing: req.body.billingAddress };
    const data = await createOrderFromCart({ tenant, userId: req.user?._id, sessionId: req.cookies?.sid, addresses, shippingMethod: req.body.shippingMethod, currency, locale });
    res.json({ order: { orderNo: data.order.orderNo, status: data.order.status, amount: data.order.amount_cents, currency }, payment: { provider: 'stripe', clientSecret: data.clientSecret } });
  } catch (e) { next(e); }
});

export default r;
```

### 6.6 routes/webhooks/stripe.ts
```ts
import { Router } from 'express';
import Order from '../../models/Order';
import { commitStock, releaseStock } from '../../services/stock';
import { stripe } from '../../services/stripe';

const r = Router();

r.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${(err as any).message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as any;
    const order = await Order.findOne({ 'payment.intentId': intent.id });
    if (order && order.status !== 'paid') {
      order.status = 'paid';
      order.payment.status = 'paid';
      order.timeline.push({ at: new Date(), ev: 'PAYMENT_SUCCEEDED', meta: { provider: 'stripe' } });
      await order.save();
      await commitStock(order.items.map(i => ({ productId: i.productId, qty: i.qty })));
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as any;
    const order = await Order.findOne({ 'payment.intentId': intent.id });
    if (order && order.status === 'awaiting_payment') {
      order.payment.status = 'failed';
      order.timeline.push({ at: new Date(), ev: 'PAYMENT_FAILED' });
      await order.save();
      await releaseStock(order.items.map(i => ({ productId: i.productId, qty: i.qty })));
    }
  }

  res.json({ received: true });
});

export default r;
```

> **Not:** Webhook route’u için bu path’e özel `express.raw()` kullanıyoruz. Diğer JSON route’lardan ayrı bir `app.use('/api/v1/webhooks/stripe', stripeWebhookRouter)` şeklinde mount et.

---

## 7) FE Entegrasyonu (minimum değişiklik)
- **CheakoutPage**’de “Öde” butonu → `POST /api/v1/checkout` çağır.  
- Cevaptaki `payment.provider==='stripe'` ve `clientSecret` ile Stripe Payment Element’i göster (ayrı sayfada veya modal).  
- Başarılı olduğunda FE’de “Sipariş alındı” ekranı/redirect.

**Pseudo kod**
```js
const res = await fetch(`${VITE_API_URL}/api/v1/checkout`, { method:'POST', headers:{ 'Content-Type':'application/json', 'X-Tenant':'ensotek' }, credentials:'include', body: JSON.stringify({ shippingAddress, billingAddress, shippingMethod }) });
const data = await res.json();
const stripe = await getStripe();
const elements = stripe.elements({ clientSecret: data.payment.clientSecret });
// <PaymentElement /> render et → stripe.confirmPayment({ elements })
```

> Temayı bozmamak için, ödeme formunu mevcut butonun tıklamasında göster; form stillerini mümkün olduğunca mevcut sınıflarla sar.

---

## 8) Tracking & Sipariş Sayfaları
- **GET `/api/v1/orders`**: kullanıcının sipariş listesi (auth)  
- **GET `/api/v1/orders/:orderNo`**: detay + timeline  
- **GET `/api/v1/orders/track/:orderNo`**: login’siz takip (opsiyonel, sadece sınırlı alanlar)

**Örnek Yanıt**
```json
{
  "order": {
    "orderNo": "MH-2025-000123",
    "status": "paid",
    "items": [ {"title":"Xoggle...","image":"product-img-1.jpg","qty":2,"price":"$27.27","total":"$54.54"} ],
    "subtotal": "$54.54",
    "discount": "$0.00",
    "shipping": "$0.00",
    "tax": "$0.00",
    "total": "$54.54",
    "timeline": [
      {"at":"2025-09-28T04:00:00Z","ev":"ORDER_CREATED"},
      {"at":"2025-09-28T04:01:00Z","ev":"PAYMENT_SUCCEEDED"}
    ]
  }
}
```

---

## 9) Adres Defteri Uçları
- `GET /api/v1/me/addresses`  
- `POST /api/v1/me/addresses`  
- `PATCH /api/v1/me/addresses/:id`  
- `DELETE /api/v1/me/addresses/:id`

**Not**: Checkout body’sinde **snapshot** gönderilse dahi, kullanıcı adres defterinden seçebilmek için bu uçlar FE’de opsiyonel kullanılabilir.

---

## 10) Env & Güvenlik
- `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`  
- `IDEMPOTENCY_TTL=24h`, `RESERVATION_TTL_MIN=15`  
- CORS, Rate Limit, body size limit  
- Webhook path’ini gizli tut, IP allowlist (opsiyonel)

---

## 11) Test Planı
- **Unit**: stock reserve/commit/release, order state transitions, idempotency.  
- **Integration**: checkout → payment_intent.succeeded webhook → order paid → stok düşümü.  
- **Edge**: double webhook, geç gelen webhook, yetersiz stok, expired reservation.

---

## 12) Sonraki Faz — Faz 4 (Backoffice & İadeler)
- Admin fulfill akışı (packing/shipped/delivered), kargo entegrasyonları.  
- İade/iptal/refund uçları + Stripe refund API.  
- Muhasebe/raporlar, stok uyarıları, e-posta bildirimleri.

