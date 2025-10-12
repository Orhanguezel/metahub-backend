# Shopo — Faz 2: Sepet, Kupon ve Checkout Hazırlığı (v1)

> Tarih: 2025-09-28  
> Amaç: **FE’yi hiç bozmadan** sepet (guest + user), kupon ve özet hesapları (subtotal, discount, shipping, tax, total) için backend uçları ve şemaları.

---

## 1) Kapsam & İlkeler
- **Alan sözleşmesi**: FE’nin beklediği tablo/sütunlar aynı kalır (title, image, color/size, price, qty, total).  
- **Dahili fiyat**: `*_cents` (integer) + `currency`, FE’ye **string** format (adapter).  
- **Çok-tenant**: her modelde `tenant`, tüm isteklerde `X-Tenant` zorunlu.  
- **Kimlik**: Guest sepeti için `sessionId` (HttpOnly cookie), kullanıcı için `userId` (JWT).  
- **Birleştirme**: Login olduğunda guest sepeti → kullanıcı sepetine **merge** edilir.

---

## 2) Veri Modelleri

### 2.1. Cart
```ts
// models/Cart.ts (öneri alanlar)
{
  _id: ObjectId,
  tenant: string,
  userId?: ObjectId,          // login ise dolu
  sessionId?: string,         // guest sepeti
  currency: string,           // "USD" | "EUR" | "TRY" ...
  items: [CartItem],
  coupon?: CouponSnapshot,    // o anki kuponun anlık kopyası
  pricing: {                  // hesaplanmış özet (cents)
    subtotal_cents: number,
    discount_cents: number,
    shipping_cents: number,
    tax_cents: number,
    total_cents: number
  },
  meta?: any,
  createdAt: Date,
  updatedAt: Date
}
```

### 2.2. CartItem
```ts
{
  _id: ObjectId,
  productId: ObjectId,
  title: string,              // FE listedeki başlık — snapshot (değişmez)
  image: string,              // FE `${PUBLIC_URL}/assets/images/${image}` — dosya adı
  sku?: string,
  variantId?: string,
  attributes?: { [k: string]: string }, // {color:"Black", size:"M"}
  qty: number,
  price_cents: number,        // baz fiyat
  offer_price_cents?: number, // indirimli fiyat (varsa)
  currency: string
}
```

### 2.3. Coupon
```ts
// models/Coupon.ts
{
  _id: ObjectId,
  tenant: string,
  code: string,                     // unique (tenant)
  type: 'percent'|'fixed'|'free_shipping',
  value: number,                    // percent: 0-100, fixed: cents
  startAt?: Date,
  endAt?: Date,
  minAmount_cents?: number,
  maxDiscount_cents?: number,
  usageLimit?: number,
  perUserLimit?: number,
  applicableProducts?: ObjectId[],  // boşsa tüm ürünler
  applicableCategories?: ObjectId[],
  status: 'active'|'inactive',
  createdAt: Date,
  updatedAt: Date
}
```

### 2.4. CouponSnapshot (Cart içine gömülü)
```ts
{
  code: string,
  type: 'percent'|'fixed'|'free_shipping',
  value: number,
  maxDiscount_cents?: number
}
```

> **Neden snapshot?** Kupon sonradan değişse de, sepette uygulandığı anın koşullarını korur.

---

## 3) API Uçları (REST)

### 3.1. GET `/api/v1/cart`
- **Kimlik:** `Authorization` (opsiyonel), `sessionId` cookie (opsiyonel). En az biri olmalı.
- **Başlık:** `X-Tenant`
- **200 Response**
```json
{
  "cart": {
    "id": "c_123",
    "currency": "USD",
    "items": [
      {
        "_id": "ci_1",
        "productId": "62a...",
        "title": "Xoggle aute et pariatur",
        "image": "product-img-1.jpg",
        "qty": 2,
        "price": "$27.27",
        "offer_price": "$18.73",
        "total": "$37.46",
        "attributes": {"color":"Black","size":"M"}
      }
    ],
    "coupon": {"code":"WELCOME10"},
    "subtotal": "$37.46",
    "discount": "$3.74",
    "shipping": "$0.00",
    "tax": "$0.00",
    "total": "$33.72"
  }
}
```

### 3.2. POST `/api/v1/cart/items`
- **Body**: `{ productId, qty, variantId?, attributes? }`
- **Davranış**: aynı ürün + aynı varyant + aynı attributes → **qty ekle** (idempotent birleşim)
- **200 Response**: (bkz. GET `/cart`)

### 3.3. PATCH `/api/v1/cart/items/:itemId`
- **Body**: `{ qty }` (0 → item sil)
- **200 Response**: (bkz. GET `/cart`)

### 3.4. DELETE `/api/v1/cart/items/:itemId`
- **200 Response**: (bkz. GET `/cart`)

### 3.5. POST `/api/v1/cart/apply-coupon`
- **Body**: `{ code }`
- **İş kuralları**: tarih, status, minAmount, limitler, uygunluk (ürün/kategori)
- **200 Response**: (bkz. GET `/cart`)

### 3.6. DELETE `/api/v1/cart/coupon`
- **200 Response**: (bkz. GET `/cart`)

### 3.7. (Ops.) POST `/api/v1/cart/shipping`
- **Body**: `{ method }` → `pricing.shipping_cents` güncellenir

### 3.8. (Ops.) POST `/api/v1/cart/tax-estimate`
- **Body**: `{ country, state, zip }` → vergi tahmini

---

## 4) Hesaplama Kuralları (Pricing Engine)
1. `line_price_cents = (offer_price_cents || price_cents) * qty`
2. `subtotal_cents = Σ line_price_cents`
3. `discount_cents = coupon(type)`
   - `percent`: `min( floor(subtotal*value/100), maxDiscount? )`
   - `fixed`: `min(value, subtotal)`
   - `free_shipping`: `shipping_cents = 0`
4. `shipping_cents`: seçilen metoda göre (default 0)
5. `tax_cents`: kural/ülkeye göre (şimdilik 0)
6. `total_cents = subtotal - discount + shipping + tax`

**Adapter (FE’ye dönüş):**
```ts
price = format(price_cents)
offer_price = offer_price_cents ? format(offer_price_cents) : undefined
total = format(line_price_cents)
subtotal/discount/shipping/tax/total → format(cents)
```

---

## 5) Guest & User Sepet Birleştirme
**Ne zaman?** Kullanıcı login olduğunda.

**Kural:** aynı `productId + variantId + attributes` olan satırlar **toplanır**.

**Algoritma (özet):**
```pseudo
userCart = find({ tenant, userId })
guestCart = find({ tenant, sessionId })
if guestCart:
  for each item in guestCart.items:
    if exists same item in userCart: increase qty
    else push item
  recalc pricing
  save userCart
  delete guestCart
return userCart
```

---

## 6) Hatalar & Validasyon
- **404 PRODUCT_NOT_FOUND**: productId yok
- **400 QTY_INVALID**: `qty<1` veya stok dışı
- **400 COUPON_INVALID/EXPIRED/NOT_APPLICABLE/LIMIT_REACHED**
- **401 UNAUTHORIZED**: protected uçlar (gerekirse)
- **429 RATE_LIMIT**: brute force kupon denemeleri

**Hata şablonu**
```json
{ "error": { "code": "COUPON_INVALID", "message": "Coupon code is not valid" } }
```

---

## 7) Mongoose Şemaları (özet kod)
```ts
// models/Cart.ts
import { Schema, model } from 'mongoose';

const CartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  title: String,
  image: String,
  sku: String,
  variantId: String,
  attributes: Schema.Types.Mixed,
  qty: { type: Number, default: 1 },
  price_cents: Number,
  offer_price_cents: Number,
  currency: { type: String, default: 'USD' }
});

const CouponSnapshotSchema = new Schema({
  code: String,
  type: String,
  value: Number,
  maxDiscount_cents: Number
});

const CartSchema = new Schema({
  tenant: { type: String, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String, index: true },
  currency: { type: String, default: 'USD' },
  items: [CartItemSchema],
  coupon: CouponSnapshotSchema,
  pricing: {
    subtotal_cents: { type: Number, default: 0 },
    discount_cents: { type: Number, default: 0 },
    shipping_cents: { type: Number, default: 0 },
    tax_cents: { type: Number, default: 0 },
    total_cents: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default model('Cart', CartSchema);
```

```ts
// models/Coupon.ts
import { Schema, model } from 'mongoose';

const CouponSchema = new Schema({
  tenant: { type: String, index: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['percent','fixed','free_shipping'], required: true },
  value: { type: Number, required: true },
  startAt: Date,
  endAt: Date,
  minAmount_cents: Number,
  maxDiscount_cents: Number,
  usageLimit: Number,
  perUserLimit: Number,
  applicableProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  status: { type: String, enum: ['active','inactive'], default: 'active' }
}, { timestamps: true });

export default model('Coupon', CouponSchema);
```

---

## 8) Servis Katmanı (özet)
```ts
// services/cartPricing.ts
export function calcCart(cart) {
  let subtotal = 0;
  for (const it of cart.items) {
    const unit = it.offer_price_cents ?? it.price_cents;
    subtotal += unit * it.qty;
  }
  let discount = 0, shipping = cart.pricing?.shipping_cents || 0, tax = 0;
  const c = cart.coupon;
  if (c) {
    if (c.type === 'percent') discount = Math.floor(subtotal * c.value / 100);
    if (c.type === 'fixed') discount = Math.min(c.value, subtotal);
    if (c.type === 'free_shipping') shipping = 0;
    if (c.maxDiscount_cents) discount = Math.min(discount, c.maxDiscount_cents);
  }
  const total = Math.max(0, subtotal - discount + shipping + tax);
  cart.pricing = { subtotal_cents: subtotal, discount_cents: discount, shipping_cents: shipping, tax_cents: tax, total_cents: total };
  return cart;
}
```

```ts
// services/cartAdapter.ts
import { formatPrice } from '../utils/price';
export function toShopoCart(cart, locale: string, currency: string) {
  const mapItem = (it) => {
    const unit = it.offer_price_cents ?? it.price_cents;
    const line = unit * it.qty;
    return {
      _id: String(it._id),
      productId: String(it.productId),
      title: it.title,
      image: it.image,
      qty: it.qty,
      price: formatPrice(it.price_cents, it.currency || currency, locale),
      offer_price: it.offer_price_cents ? formatPrice(it.offer_price_cents, it.currency || currency, locale) : undefined,
      total: formatPrice(line, it.currency || currency, locale),
      attributes: it.attributes || undefined
    };
  };
  return {
    cart: {
      id: String(cart._id),
      currency,
      items: cart.items.map(mapItem),
      coupon: cart.coupon ? { code: cart.coupon.code } : undefined,
      subtotal: formatPrice(cart.pricing.subtotal_cents, currency, locale),
      discount: formatPrice(cart.pricing.discount_cents, currency, locale),
      shipping: formatPrice(cart.pricing.shipping_cents, currency, locale),
      tax: formatPrice(cart.pricing.tax_cents, currency, locale),
      total: formatPrice(cart.pricing.total_cents, currency, locale)
    }
  };
}
```

---

## 9) Router Taslağı
```ts
// routes/cart.ts
import { Router } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import { calcCart } from '../services/cartPricing';
import { toShopoCart } from '../services/cartAdapter';
import { env } from '../config/env';

const r = Router();

function getIdentity(req) {
  return { tenant: req.tenant!, userId: req.user?._id, sessionId: req.cookies?.sid };
}

async function loadOrCreateCart({ tenant, userId, sessionId, currency }) {
  let cart = await Cart.findOne({ tenant, ...(userId?{userId}:{sessionId}) });
  if (!cart) cart = await Cart.create({ tenant, userId, sessionId, currency, items: [], pricing: { subtotal_cents:0, discount_cents:0, shipping_cents:0, tax_cents:0, total_cents:0 } });
  return cart;
}

r.get('/', async (req, res, next) => {
  try {
    const identity = getIdentity(req);
    const cart = await loadOrCreateCart({ ...identity, currency: env.DEFAULT_CURRENCY });
    calcCart(cart);
    res.json(toShopoCart(cart, req.locale!, env.DEFAULT_CURRENCY));
  } catch (e) { next(e); }
});

r.post('/items', async (req, res, next) => {
  try {
    const { productId, qty=1, variantId, attributes } = req.body;
    const identity = getIdentity(req);
    const cart = await loadOrCreateCart({ ...identity, currency: env.DEFAULT_CURRENCY });

    const prod = await Product.findOne({ _id: productId, tenant: identity.tenant, status:'active' });
    if (!prod) return res.status(404).json({ error: { code:'PRODUCT_NOT_FOUND', message:'Product not found' } });

    const price = prod.offer_price_cents ?? prod.price_cents;
    if (qty < 1) return res.status(400).json({ error: { code:'QTY_INVALID', message:'Quantity must be >=1' } });

    const key = (it:any) => `${it.productId}|${it.variantId||''}|${JSON.stringify(it.attributes||{})}`;
    const kNew = key({ productId, variantId, attributes });
    const found = cart.items.find((it:any) => key(it) === kNew);
    if (found) found.qty += qty; else cart.items.push({
      productId,
      title: prod.title,
      image: prod.image || prod.images?.[0] || 'product-img-1.jpg',
      sku: prod.sku,
      variantId, attributes, qty,
      price_cents: prod.price_cents,
      offer_price_cents: prod.offer_price_cents,
      currency: prod.currency
    });

    calcCart(cart); await cart.save();
    res.json(toShopoCart(cart, req.locale!, env.DEFAULT_CURRENCY));
  } catch (e) { next(e); }
});

r.patch('/items/:itemId', async (req, res, next) => {
  try {
    const { qty } = req.body; const { itemId } = req.params;
    const identity = getIdentity(req);
    const cart = await loadOrCreateCart({ ...identity, currency: env.DEFAULT_CURRENCY });
    const it:any = cart.items.id(itemId);
    if (!it) return res.status(404).json({ error:{ code:'ITEM_NOT_FOUND', message:'Cart item not found' } });
    if (qty <= 0) cart.items.id(itemId).deleteOne(); else it.qty = qty;
    calcCart(cart); await cart.save();
    res.json(toShopoCart(cart, req.locale!, env.DEFAULT_CURRENCY));
  } catch (e) { next(e); }
});

r.delete('/items/:itemId', async (req, res, next) => {
  try {
    const identity = getIdentity(req);
    const cart = await loadOrCreateCart({ ...identity, currency: env.DEFAULT_CURRENCY });
    const it = cart.items.id(req.params.itemId);
    if (!it) return res.status(404).json({ error:{ code:'ITEM_NOT_FOUND', message:'Cart item not found' } });
    it.deleteOne();
    calcCart(cart); await cart.save();
    res.json(toShopoCart(cart, req.locale!, env.DEFAULT_CURRENCY));
  } catch (e) { next(e); }
});

r.post('/apply-coupon', async (req, res, next) => {
  try {
    const { code } = req.body; const identity = getIdentity(req);
    const cart = await loadOrCreateCart({ ...identity, currency: env.DEFAULT_CURRENCY });
    const now = new Date();
    const c = await Coupon.findOne({ tenant: identity.tenant, code: code.toUpperCase(), status:'active', $or:[{startAt:null},{startAt:{$lte:now}}], $or2:[{endAt:null},{endAt:{$gte:now}}] });
    if (!c) return res.status(400).json({ error:{ code:'COUPON_INVALID', message:'Coupon code is not valid' } });

    // minAmount kontrolü için önce hesapla
    calcCart(cart);
    if (c.minAmount_cents && cart.pricing.subtotal_cents < c.minAmount_cents)
      return res.status(400).json({ error:{ code:'COUPON_NOT_APPLICABLE', message:'Minimum amount not met' } });

    cart.coupon = { code: c.code, type: c.type, value: c.value, maxDiscount_cents: c.maxDiscount_cents };
    calcCart(cart); await cart.save();
    res.json(toShopoCart(cart, req.locale!, env.DEFAULT_CURRENCY));
  } catch (e) { next(e); }
});

r.delete('/coupon', async (req, res, next) => {
  try {
    const identity = getIdentity(req);
    const cart = await loadOrCreateCart({ ...identity, currency: env.DEFAULT_CURRENCY });
    cart.coupon = undefined;
    calcCart(cart); await cart.save();
    res.json(toShopoCart(cart, req.locale!, env.DEFAULT_CURRENCY));
  } catch (e) { next(e); }
});

export default r;
```

---

## 10) FE Entegrasyonu (minimum değişiklik)
- **CartPage** ve **Wishlist** sayfalarında tablo verisini artık `/api/v1/cart`’tan çek.  
- Ekle/sil/güncelle butonları sırasıyla: `POST /cart/items`, `DELETE /cart/items/:id`, `PATCH /cart/items/:id` çağırır.  
- Kupon alanı: `POST /cart/apply-coupon` / `DELETE /cart/coupon`.

**Örnek:**
```js
fetch(`${VITE_API_URL}/api/v1/cart`, { headers: { 'X-Tenant': 'ensotek' }, credentials: 'include' })
  .then(r=>r.json()).then(setCart)
```
> `credentials: 'include'` → session cookie (guest) için gerekli.

---

## 11) Test Planı
- **Unit**: pricing engine (`calcCart`) — percent/fixed/free_shipping, maxDiscount, minAmount, edge cases (qty=0, büyük qty).  
- **E2E**: add → patch → delete → apply coupon → remove coupon → totals.  
- **Merge**: guest sepetinde 2 ürün, login sonrası user sepete birleşmesi.

---

## 12) Sonraki Faz (Faz 3 — Checkout & Ödeme)
- Adres defteri uçları (`/me/addresses`),
- `POST /checkout` (order draft + payment intent),
- Webhook (Stripe/iyzico) + sipariş durum makinesi,
- Order detayları (`/orders/:orderNo`).

