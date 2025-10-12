harika, Postman’a direkt import edip koşabileceğin **kategori koleksiyonu** ve **environment** dosyalarını hazırladım. 👇

* **Collection:** [Shopo_Categories.postman_collection.json](sandbox:/mnt/data/Shopo_Categories.postman_collection.json)
* **Environment (Local):** [Shopo_Local.postman_environment.json](sandbox:/mnt/data/Shopo_Local.postman_environment.json)

## İçerik (kısaca)

### Env değişkenleri

* `base_url` → ör. `http://localhost:3000/api/v1`
* `tenant` → ör. `demo` (header `X-Tenant` olarak gönderilir)
* `token` → admin JWT (Bearer)
* `locale` → `en` (header `Accept-Language`)
* `category_id` / `category_slug` → testler sırasında otomatik set/clear edilir

### Klasörler ve istekler

**Categories – Public**

* `GET /categories?view=shopo` — shopo kart görünümü
* `GET /categories` — full liste
* `GET /categories/tree` — ağaç yapı
* `GET /categories/slug/{{category_slug}}` — slug ile getirir (bulursa `category_id` env’e yazar)
* `GET /categories/{{category_id}}` — id ile getirir

**Categories – Admin**

* `GET /categories/admin/list?active=true&parent=root` — filtreli liste
* `POST /categories` — **form-data** ile create (name/description JSON string). Test, `category_id` ve `category_slug`’ı env’e yazar.
* `PUT /categories/{{category_id}}` — **form-data** ile update (opsiyonel image ekleme, flag’ler)
* `DELETE /categories/{{category_id}}` — sil (child/product varsa 409 döner; 200’de env’den id/slug temizlenir)

> Not: **Create/Update** isteklerinde `images` alanı **form-data** dosya olarak tanımlı ama `src` boş bırakıldı — Postman’da ister dosya seç, ister boş bırak (dosya zorunlu değil). `name` ve `description` alanlarına JSON string veriyoruz (ör. `{"en":"Shoes","tr":"Ayakkabılar"}`).

---

## E2E test sırası (öneri)

Kategori bittiğinde uçtan uca mantıklı ilerleyiş şöyle:

1. **Categories** (şu an yaptık)
2. **Products**

   * Admin: create/update (kategori ilişkilendir), varyasyon/opsiyon, fiyat/stock meta, görseller
   * Public: listing (category/slug), detail
3. **Inventory**

   * Admin: **Adjustment** ucu (delta + reason)
   * Stockledger doğrulaması (opsiyonel)
4. **Orders**

   * Public: sepet → checkout → order create
   * Admin: order list/detail, status (packing → shipped → delivered), cancel
5. **Payments**

   * Checkout intent → provider dönüşleri (mock) → webhook
6. **Returns (RMA) & Refunds**

   * RMA create → received/approved → **restock** + **refund trigger**
   * Payments webhook’unda **Refund** güncellemesi
7. **Shipments** (ekledikten sonra)

   * Shipment create/label/shipped/delivered → stok `out` hareketleri

İstersen hemen **Products** için de aynı şekilde Postman koleksiyonu ve örnek payload’larla devam edeyim; ya da önce **Inventory Adjustment** ucunu ekleyip stok doğrulamasını ürünle birlikte çalıştırabiliriz. Hangisinden başlayalım?
