süper—Shop (Shopo) e-ticaret projesi için **Metahub backend**’inde mevcut modülleri baz alıp önce “ne eksik”i netleştireyim; sonra da “hangilerini nasıl yeniden adlandırıp/şekillendirip” kullanacağımızı çıkarayım.

# 1) Eksik (eklenecek) modüller — **çekirdek (must-have)**

* **product** *(varsa `ensotekprod` → rename/merge)*
* **brand**
* **product_attribute**
* **product_variant**
* **wishlist**
* **compare**
* **review** *(yorumdan farklı; rating + moderasyon)*
* **return_rma**
* **refund**
* **payment_provider** *(ödeme konfig: stripe/iyzico/paypal anahtarları)*
* **tax_rate** *(KDV/ülke/eyalet oranları; checkout hesabı)*
* **search_index** *(ürün arama için indeks/projeksiyon)*
* **suggestion** *(otomatik öneri/auto-complete; opsiyonel ama önerilir)*
* **inventory** *(ürün başına anlık stok)*

> Not: `stockmovement` var; onu **stock_ledger** olarak konumlandırıp **inventory** ile birlikte kullanacağız (ledger = defter; inventory = anlık stok görünümü).

# 2) Opsiyonel ama faydalı (nice-to-have)

* **media_asset** *(dosya/galeri’yi tekleştirir; thumb/metadata)*
* **shipping_method** *(kargo method/rate tabloları)*
* **currency** & **locale** *(settings’de yoksa ayrıştır)*
* **giftcard**, **loyalty** *(ileride kampanya seti genişlerse)*
* **geozone** *(vergi/kargo zonları)*
* **fee** *(kapıda ödeme, paketleme vb. ilave ücretler)*

---

# 3) Mevcut → Hedef eşleştirme (rename/merge/keep)

Aşağıda log’unda görünen modülleri e-ticaret hedef yapısına göre konumluyorum:

## Katalog & İçerik

* `ensotekprod` ➜ **product** *(rename/merge; şema: id, title, brandId, images, price_cents, offer_price_cents, attributes[], variants[], stock, status, tenant…)*
* `ensotekcategory` / `catalog` ➜ **category** *(category ağaç yapısı; katalog route’ları category/product/brand’ı birleştiren “okuma” katmanı olabilir)*
* `pricing`, `pricelist` ➜ **pricing** *(B2C tek fiyat + indirim; B2B varsa price list’ler)*
* `promotions`, `coupon` ➜ **promotion**, **coupon** *(aynen devam; validation servisleriyle)*
* `files`, `gallery`(+`gallerycategory`) ➜ **media_asset** *(tek çatı; ürün görselleri/asset’ler)*
* `seo` ➜ **seo** *(title/description, sitemap feed’leri; keep)*
* `blog`, `articles`, `faq`, `page` (yoksa `section`) ➜ **cms** başlığı altında kalabilir (keep)

## Müşteri & Kimlik

* `users` ➜ **user** *(auth/role)*
* `customer` ➜ **customer** *(user’a bağlı müşteri profili; adres defteri bağlantısı)*
* `address` ➜ **address_book** *(müşteri adres defteri; checkout ile entegre)*
* `comment`, `reactions` ➜ **review** *(yorum ≠ review; review = rating + onay; reactions = like/dislike olarak review’a bağlanır)*
* `newsletter`, `notification`, `email` ➜ **notification** *(keep; şablonlar `notification_template` altına alınabilir)*

## Sepet & Sipariş & Ödeme & Kargo

* `cart` ➜ **cart** *(items gömülü; guest session + user merge)*
* `order` ➜ **order** *(ana koleksiyon; items/payment/shipments/returns/refunds gömülü — bkz. embed-first strateji)*
* `payments` ➜ **payment** *(projeksiyon koleksiyonu OLARAK kalabilir; **order.payment** ana gerçeklik. İstersen rename → `payments`=projection)*
* `shipment` ➜ **shipment** *(projeksiyon koleksiyonu OLARAK kalabilir; **order.shipments[]** gerçeklik)*
* (yok) ➜ **payment_provider** *(YENİ; stripe/iyzico/paypal konfig)*
* (yok) ➜ **return_rma**, **refund** *(**order** içinde gömülü; gerekirse projeksiyon koleksiyonları eklenir)*

## Stok & Operasyon

* `stockmovement` ➜ **stock_ledger** *(defter hareketleri; IN/OUT/RESERVE/RELEASE/RETURN/ADJUST)*
* (yok) ➜ **inventory** *(ürün bazında anlık stok tablosu/projeksiyonu; admin ekranı buradan beslenir)*
* `reports`, `analytics` ➜ **report/analytics** *(keep)*
* `operationsjobs`, `operationstemplates`, `scheduling`, `job_queue` (yok) ➜ **jobs/cron** *(keep; rezervasyon TTL, kargo tracking, düşük stok alarmı)*

## Platform & Entegrasyon

* `tenants`, `settings` ➜ **tenant**, **settings** *(keep; para birimi/dil mağaza bazlı)*
* `webhooks` ➜ **webhook** *(ödeme/kargo webhooks)*
* `authlite`, `users`, `role` (log’da `role` yok; permissions users içinde olabilir) ➜ **auth/RBAC** *(keep)*
* `company`, `branch` ➜ **store**/organizasyonel (keep)
* `invoicing`, `billing` ➜ **invoicing** *(fatura entegrasyonları; EU/DE gereksinimleri varsa)*

---

# 4) “Embed-first” mimarisi (özet karar)

* **Tek gerçeklik:** `orders` koleksiyonu.
  `order_items[]`, `payment`, `shipments[]`, `returns[]`, `refunds[]` → **gömülü alt dokümanlar.**
* **Projeksiyonlar** (gerektikçe): `payments`, `refunds`, `shipments`, `inventory`, `search_index`.

  > Raportlama/warehouse/harici uygulamalar için hızlı okuma sağlamak amacıyla **event/outbox** ile doldurulur.
* **Stok:** `stock_ledger` (hareket) + `inventory` (anlık görünüm).
* **Vergi:** `tax_rate` (ülke/eyalet bazlı) + checkout hesaplayıcı.

---

# 5) Somut “yapılacaklar” listesi (sırayla)

1. **Rename/normalize (no-breaking)**

   * `ensotekprod` → **product**
   * `ensotekcategory` → **category**
   * `stockmovement` → **stock_ledger**
2. **Yeni minimal şemalar**

   * **brand**, **product_attribute**, **product_variant**
   * **wishlist**, **compare**, **review**
   * **payment_provider**, **tax_rate**
   * **inventory** (projeksiyon)
3. **Order şemasını genişlet**

   * `payment` (embedded), `shipments[]`(packages/events), `returns[]`, `refunds[]`
4. **Jobs/Cron**

   * rezervasyon süresi dolan siparişleri serbest bırak
   * kargo tracking polling/webhook
   * düşük stok alarmı
5. **Search**

   * **search_index** projeksiyonu; ürün publish/update’te doldur
6. **API uyumluluk sözleşmesi**

   * Shopo FE’nin beklediği alanlar için adapter’lar (price string formatlama vb.)

---

# 6) Modül adları – **nihai isim listesi (backend)**

**(Var + Rename + Yeni)**

* tenant, settings, auth, user, audit_log, webhooks
* **product**, **category**, **brand**, **product_attribute**, **product_variant**
* **inventory**, **stock_ledger**
* pricing, promotion, coupon
* **wishlist**, **compare**, **review**
* cart
* **order** *(embedded: items, payment, shipments, returns, refunds)*
* **payment_provider**, *(opsiyonel projeksiyon:)* payments, refunds, shipments
* **tax_rate**, currency (settings’teyse ayrı gerekmez), locale (settings)
* **search_index**, suggestion
* media_asset (files/gallery birleşimi) *(opsiyonel)*
* invoicing, reports/analytics, jobs/cron

---

İstersen bir sonraki adımda **rename/normalize migration planını** (koleksiyon adları, indeksler, basit Mongoose şemaları ve minimum seed) hazırlayayım; ardından **orders** için gömülü yapıya geçiş patch’lerini çıkarırız.
