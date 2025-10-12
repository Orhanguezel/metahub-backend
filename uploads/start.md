süper—Shopo temasını ve paketi açtım, `client/src` içeriğini taradım ve temanın **ürün verisini** nasıl beklediğini çıkardım. Ayrıca “rg yok” hatan için de pratik çözümleri ekledim.

## 1) “rg” yerine ne kullanayım?

* Hızlı kurulum:

  ```bash
  sudo apt install ripgrep
  ```
* Alternatif (yerleşik grep):

  ```bash
  grep -RInE 'product\.[A-Za-z0-9_]+' client/src
  grep -RInE 'cart\.[A-Za-z0-9_]+' client/src
  grep -RInE 'order|checkout' client/src
  ```
* Node/TS tarafında da ufak bir scriptle aynı işi görebilirsin; istersen şablon çıkarırım.

## 2) Temanın gerçek veri şekli (doğrudan dosyadan)

Demo projede **gerçekten kullanılan ürün şekli** `client/src/data/products.json` içinde. Örnek alanlar:

* `id` (string)
* `image` (örn. `"product-img-1.jpg"`)
* `brand` (örn. `"xioami"`)
* `review` (number, 1–5)
* `title` (string)
* `offer_price` (string, `"$18.73"` gibi)
* `price` (string, `"$27.27"`)
* `campaingn_product` (boolean)
* `cam_product_available` (number | null)
* `cam_product_sale` (number | null)
* `product_type` (örn. `"popular"` | null)

Bu temada grid/list, wishlist ve tekil ürün sayfaları **bu isimlerle** çalışıyor. Yani backend’in **en az** bu alanları döndürürse **frontend’i hiç bozmadan** ilerlersin.

İndirilebilir çıktı:

* [Shopo’dan çıkarılan ürün şeması (JSON)](sandbox:/mnt/data/shopo_schema_from_products_json.json)
* [Genişletilmiş e-ticaret şeması taslağı (JSON)](sandbox:/mnt/data/shopo_schema_inferred.json)

Ayrıca analiz tablolarını da ekrana bıraktım: `shopo_product_tokens`, `shopo_variant_tokens`, `shopo_cart_tokens`, `shopo_order_tokens` vb. (UI’da görüyor olmalısın). Bunlar, kodda hangi anahtarların geçtiğini hızlıca görmeni sağlar.

## 3) “Uyumluluk sözleşmesi” (Backend → Frontend)

Frontend’i dokunmadan tutmak için API’lerinin **tam olarak bu alan adlarıyla** dönmesini öneriyorum:

### Listeleme (GET `/api/products`)

```json
{
  "products": [
    {
      "id": "62aefe9ad8b80d5234af625a",
      "image": "product-img-1.jpg",
      "brand": "xioami",
      "review": 3,
      "title": "Xoggle aute et pariatur...",
      "offer_price": "$18.73",
      "price": "$27.27",
      "campaingn_product": false,
      "cam_product_available": null,
      "cam_product_sale": null,
      "product_type": null
    }
  ],
  "total": 124,
  "page": 1,
  "pageSize": 24
}
```

### Tekil ürün (GET `/api/products/:id-or-slug`)

Aynı alanlara ek +detay:

```json
{
  "product": {
    "id": "62aefe9ad8b80d5234af625a",
    "title": "...",
    "image": "product-img-1.jpg",
    "images": ["product-img-1.jpg","product-img-1b.jpg"], 
    "brand": "xioami",
    "review": 4.2,
    "price": "$27.27",
    "offer_price": "$18.73",
    "sku": "SKU-123",
    "stock": 48,
    "attributes": [
      {"name": "color", "value": "Black"},
      {"name": "size", "value": "M"}
    ],
    "variants": [
      {"id":"v1","sku":"SKU-123-BLK-M","price":"$27.27","offer_price":"$18.73","stock":12,"options":{"color":"Black","size":"M"}}
    ],
    "description": "<p>HTML...</p>"
  },
  "related": [ ...aynı ürün şekli... ]
}
```

> Not: Temada para birimi string (`"$27.27"`) olarak yazılmış. Backend’de **gerçekte numeric + currency** saklayıp, yanıt verirken bu stringi **formatlayıp** dönmeni öneririm.

## 4) Metahub için önerilen veri modelleri (minimum kırılımsız)

Aşağıdaki şemalar **Shopo’nun beklediği alanları** 1:1 karşılar; aynı zamanda “tam fonksiyonlu e-ticaret” için gerekenleri “opsiyonel” olarak ekler.

### Product

* **Zorunlu:** `id`, `title`, `image`, `price (string)`, `offer_price (string?)`, `brand`, `review (number)`, `campaingn_product (bool)`, `cam_product_available (number|null)`, `cam_product_sale (number|null)`, `product_type`
* **Önerilen dahili alanlar (backend’de tutulur, UI’ya dönmek şart değil):**
  `price_cents (int)`, `currency`, `slug`, `sku`, `barcode`, `stock`, `status`, `images[]`, `attributes[]`, `variants[]`, `categoryId`, `brandId`, `seoTitle/seoDescription`, `tenant`, `translations?`

### Category

* `id`, `name`, `slug`, `parentId?`, `image?`, `order?`, `status?`

### Brand

* `id`, `name`, `slug`, `logo?`, `order?`, `status?`

### User (Customer)

* `id`, `name`, `email`, `passwordHash`, `phone?`, `avatar?`, `addresses[]`

### Address

* `fullName`, `line1`, `line2?`, `city`, `state?`, `zip`, `country`, `phone?`, `isDefault?`

### Cart

* `id`, `userId|null`, `sessionId`, `currency`, `items[]`, `coupon?`, `subtotal`, `discount`, `shipping`, `tax`, `total`
* **CartItem:** `productId`, `title`, `image`, `qty`, `price (string)`, `offer_price? (string)`, `variantId?`, `attributes?{color,size,...}`, `sku?`

### Order

* `id`, `orderNo`, `userId`, `items[]` (CartItem gibi), `amount` (numeric), `currency`, `status` (created/paid/packing/shipped/delivered/returned/refunded), `payment`, `shippingAddress`, `billingAddress`, `coupon?`, `discount?`, `shippingCost?`, `tax?`, `notes?`, `timeline[]`, `createdAt`, `updatedAt`

### Coupon / Promotion

* `code`, `type` (percent/fixed/free_shipping), `value`, `startAt?`, `endAt?`, `minAmount?`, `maxDiscount?`, `usageLimit?`, `perUserLimit?`, `applicableProducts?[]`, `applicableCategories?[]`, `status`

### Review

* `id`, `productId`, `userId`, `rating`, `title?`, `content`, `images?[]`, `status`, `createdAt`

> Yüklediğim geniş taslak JSON: [shopo_schema_inferred.json](sandbox:/mnt/data/shopo_schema_inferred.json)

## 5) Mongoose/TS hızlı şablon (Metahub stilinde)

> **Hedef:** FE’yi hiç kırmadan aynı alan adlarıyla dönmek.

```ts
// models/Product.ts
import { Schema, model } from "mongoose";

const VariantSchema = new Schema({
  sku: String,
  price_cents: Number,
  currency: { type: String, default: "USD" },
  offer_price_cents: Number,
  stock: Number,
  options: Schema.Types.Mixed, // {color, size, ...}
  image: String
});

const ProductSchema = new Schema({
  tenant: { type: String, index: true },

  // FE-compat fields (1:1)
  title: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: String, required: true },         // "$27.27"
  offer_price: { type: String },                   // "$18.73"
  brand: String,
  review: { type: Number, default: 0 },
  campaingn_product: { type: Boolean, default: false },
  cam_product_available: { type: Number, default: null },
  cam_product_sale: { type: Number, default: null },
  product_type: { type: String, default: null },

  // Internal (sağlam veri katmanı)
  slug: { type: String, index: true },
  sku: String,
  price_cents: Number,
  offer_price_cents: Number,
  currency: { type: String, default: "USD" },
  images: [String],
  stock: Number,
  attributes: [{ name: String, value: String }],
  variants: [VariantSchema],
  categoryId: Schema.Types.ObjectId,
  brandId: Schema.Types.ObjectId,
  status: { type: String, default: "active" }
}, { timestamps: true });

export default model("Product", ProductSchema);
```

> **Response Adapter (Service Katmanı):** DB’de `price_cents` tut; FE’ye dönerken `"$27.27"` gibi stringleri **formatlayıp** `price/offer_price` alanlarına yaz. Böylece Shopo bileşenleri hiç değişmez.

## 6) API uçları (minimum, FE kırmadan)

* `GET /api/products?search=&brand=&category=&minPrice=&maxPrice=&sort=&page=&pageSize=`
  → `{ products: [...], total, page, pageSize }`
* `GET /api/products/:id-or-slug` → `{ product, related }`
* `GET /api/categories` → basit `id, name, slug, image?`
* `GET /api/brands` → `id, name, slug, logo?`
* `POST /api/cart/items` (body: productId, qty, variantId?, attributes?)
  `GET /api/cart` → FE tablosundaki sütunları dolduracak şekilde `title/image/price/qty/total`
* `POST /api/checkout` → sipariş oluşturur (ödeme entegrasyonu Stripe/Iyzico/PayPal seçilebilir)
* `GET /api/orders/mine` / `GET /api/orders/:orderNo`
* `POST /api/coupons/validate`
* `POST /api/reviews`

> Not: Temada “CheakoutPage” yazımı var; endpoint isimleri doğru kalsa da UI sabit kalır.

## 7) “Tam fonksiyonlu e-ticaret” kontrol listesi

* **Katalog:** ürün, kategori, marka, varyant/opsiyon, stok, medya
* **Arama & Filtre:** metin, kategori/marka/etiket, fiyat aralığı, sıralama
* **Fiyatlandırma & Kampanya:** list price, offer price, kupon, kampanya etiketleri
* **Sepet & Checkout:** misafir sepeti (sessionId), kayıtlı kullanıcı sepeti, teslimat, fatura adresi, kargo, vergi
* **Ödeme:** Stripe / İyzico / PayPal (webhook + sipariş durum akışı)
* **Hesap:** profil, adres defteri, sipariş geçmişi, iade/iptal talebi
* **Wishlist & Karşılaştırma**
* **Yorum/Değerlendirme + Moderasyon**
* **Bildirimler:** e-posta, opsiyonel SMS
* **Raporlama:** satış, en çok satanlar, stok uyarıları
* **SEO:** ürün/kategori slug, meta, OpenGraph, sitemap
* **Çoklu dil/tenant (Metahub standardı):** `tenant`, `translations?` alanları (opsiyonel)

## 8) Sonraki adım önerim

1. **Products endpoint’ini** temanın beklediği alan adlarıyla aç: `price/offer_price` string; `review` number; `brand`, `image`, `title`.
2. **Adapter**: DB → Response formatter (cents → `"$"` string).
3. **List/Detail** sayfalarını gerçek API ile bağla (şimdilik `products.json` yerine).
4. Sepet/checkout akışına **Cart** ve **Order** uçlarını bağla.
5. Kupon, kargo, ödeme (Stripe) ile akışı tamamla.

İhtiyaç olursa, Metahub’ta **RTK Query** servisleri ve **Express route**/controller şablonlarını da aynı isimlerle (hiç FE kırmadan) çıkarabilirim.
