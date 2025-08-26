Harika—önce **modül listesi** ve **yol haritasını** netleştirelim (şimdilik **kod yok**). Aşağıdaki yapı MetaHub standartlarıyla (multi-tenant, i18n, TRY varsayılan, Europe/Istanbul TZ) uyumlu ve başka lokantalarca da kolayca yeniden kullanılabilir.

---

# Restaurant Ordering — Modül Listesi (MetaHub Standartları)

## A) Çekirdek

1. **branch (şube)**
   Konum (2dsphere), çalışma saatleri, servis türleri (delivery/pickup/dine-in), min hazırlık süresi, teslimat bölgeleri (polygon/radius), şube bazlı fiyat/menü ataması.

2. **contacts & addresses (müşteri + adres defteri)**
   Kişi/kurum, telefon/e-posta index’leri, favori adres, son siparişler.

3. **settings & modules**
   Tenant/şube düzeyinde modül anahtarları (dine-in açık mı, bahşiş aktif mi, vergi modeli, para birimi), SEO/meta.

4. **files**
   Ürün görselleri, marka/logolar, PDF fişler vb.

5. **employees** *(mevcut)*
   Kurye/mutfak/personel kayıtları (vardiya & time tracking entegrasyonu).

---

## B) Menü & Katalog

6. **menucategory**
   Kategori sırası, görünürlük, i18n ad.

7. **menuitem (ürün)**
   i18n ad/açıklama, görseller, **variants** (boyut), **modifierGroups** (ekstra/ilave), vergi oranı, şube bazlı fiyat opsiyonu.

8. **modifiergroup / modifieritem**
   Min/Max, zorunlu/opsiyonel, çoklu seçim, fiyat etkisi.

9. **combo (set menü)**
   Birden fazla item + grup kuralları, paket fiyatları.

10. **availability (saat/gün bazlı erişim)**
    Kahvaltı/özel gün, rrule/slot istisnaları.

11. **pricelist** *(mevcut, güncellenecek)*
    Şube/kanal bazlı fiyat listeleri (opsiyonel: promolarla etkileşim).

---

## C) Sepet & Sipariş Akışı

12. **cart / order-draft**
    Oturum/kullanıcıya bağlı geçici sepet; fiyat hesaplama, kupon/bahşiş/ücretler.

13. **orders**
    Kalemler (variant+modifier snapshot’lı), servis türü (**delivery/pickup/dine-in**), ücretler (delivery fee, service fee, tip), durum akışı:
    `pending → confirmed → in_kitchen → ready → out_for_delivery|picked_up → delivered → completed` (+ `canceled`).

14. **payments** *(mevcut, uyarlanacak)*
    Nakit/kart/online/kapıda ödeme, iade/partial refund; ödeme durumları.

15. **invoicing** *(mevcut, uyarlanacak)*
    Fiş/fatura üretimi, KDV, ödeme ile uzlaşma.

---

## D) Teslimat & Mutfak Operasyonları

16. **delivery**
    Teslimat bölgeleri (polygon), kurye ataması, rota/duraklar, tahmini süre, teslim tutanakları.

17. **kds (Kitchen Display System)**
    **kitchenticket**, **station** (sıcak/soğuk/fırın), “fire/hold/ready” aksiyonları; sipariş kalemi → istasyon yönlendirme.

18. **tables & qr (dine-in)**
    Masa kodları, QR token, masadan sipariş; servis ücreti/bahşiş kuralları.

---

## E) Kampanya & Sadakat

19. **coupons** *(mevcut, uyarlanacak)*
    Kod, kural seti (min tutar, kategori/ürün kısıtı, tarih/saat aralığı).

20. **giftcard**
    Bakiyeli hediye kartı (tenant/şube bazlı).

21. **loyalty**
    Puan/kademe, kazanım/harcama kuralları.

---

## F) Stok & Maliyet

22. **inventory**
    Malzeme/gramaj, stok hareketleri (giriş/çıkış), lot/son kullanma (opsiyon).

23. **recipe (BOM)**
    Menü kaleminin reçetesi; satışta stok düşümü, porsiyon varyantlarına göre gramaj.

24. **purchasing**
    Tedarikçi/satın alma siparişi, maliyet hesapları.

---

## G) Finans & Raporlama

25. **cashbook** *(mevcut)*
    Kasa giriş/çıkış, gün sonu.

26. **expenses** *(mevcut)*
    Gider kategorileri (kira, enerji, hammadde), nakit/çek/transfer.

27. **reports** *(mevcut, genişletilecek)*
    Satış (ürün/kategori/saat/kanal/şube), kârlılık (COGS), kurye performansı, iptal/iade raporları.

---

## H) Destekleyici & Entegrasyon

28. **notifications** *(mevcut)*
    E-posta/SMS/WS push: sipariş alındı/hazır/teslim edildi.

29. **webhooks**
    POS yazıcısı, harici BI, 3. parti muhasebe.

30. **payment gateways**
    Stripe/iyzico vb. sürücü katmanı.

31. **aggregators** *(V2+)*
    Lieferando/UberEats/Glovo bağlayıcıları.

32. **audit & monitoring**
    İşlem günlükleri, metrikler, health checks, rate-limit.

---

# Yol Haritası (Aşamalı)

## Faz 0 — Hazırlık (Altyapı)

* Tenant çözümleme, `x-tenant` zorunluluğu, i18n hata anahtar şablonu.
* Standart API yanıt sözleşmesi, loglama, test tenant’ı + örnek data.

## Faz 1 — MVP (Menü + Sipariş + Temel Ödeme)

* **branch**, **menucategory**, **menuitem** (+variant/modifier)
* **availability** (temel saat kuralları)
* **cart / order-draft** → **orders** (delivery/pickup/dine-in seçimi, fiyat hesap)
* **payments** (nakit/manuel onay) + **invoicing** (fiş)
* **notifications** (sipariş alındı/ilerleme)
* **reports (basic)**: günlük satış, ürün satış sayıları

## Faz 2 — Operasyon Derinleştirme

* **delivery**: polygon bölge + ücret, kurye atama & durumlar
* **kds**: istasyonlar, ticket akışı, “ready” senaryoları
* **coupons** + **tip** + servis ücreti politika setleri
* **pickup slot** doğrulama (şube saatleri + min hazırlık)

## Faz 3 — Dine-in & Gelişmiş Fiyatlama

* **tables & qr** (masadan sipariş)
* **pricelist** gelişmiş kurallar (şube/kanal/saat bazlı)
* Çoklu para birimi (opsiyon), vergi kuralları detayları

## Faz 4 — Stok & Kârlılık

* **inventory + recipe + purchasing** (satışta stok düşümü, COGS)
* **reports advanced** (kârlılık, fire oranı, kurye performansı)
* **cashbook/expenses** entegrasyonu ve gün sonu

## Faz 5 — Entegrasyonlar & Ölçek

* **payment gateways** üretim sürücüleri
* **aggregators** bağlayıcıları
* **webhooks**, POS yazıcı entegrasyonu, izleme/alarmlar

---

# Hangi Modüller Mevcut & Güncelleme Durumu

* **Mevcut ve yeniden kullanılacak**: contacts, payments, invoicing, expenses, employees, reports, files, cashbook, notifications, timetracking, scheduling, pricelist.
* **Yeni geliştirilecek**: branch, menucategory, menuitem, modifiers, combo, availability, cart/order-draft, orders (restaurant akışına özel durumlar), delivery, kds, tables/qr, coupons (revize), giftcard, loyalty, inventory, recipe, purchasing, webhooks, gateways, aggregators, audit/monitoring.

---

# Kabul Kriterleri (MVP için özet)

* Tüm uçlar `x-tenant` olmadan 400/401 ile reddedilir.
* Menü → sepet → sipariş → ödeme → fiş zinciri tek tenant/şube için eksiksiz işler.
* Delivery/pickup/dine-in seçenekleri için zorunlu alan doğrulamaları (adres/slot/masa).
* Liste uçlarında sayfalama varsayılanı: `limit=20`, sıralama `createdAt:desc`.
* Index stratejisi: `(tenant, code)` benzersiz, 2dsphere (branch.location & teslimat polygon), `(tenant, status, branchId, createdAt)` siparişler.

---

# Dosya Ağacı Planı (yol gösterici, **kod yok**)

* `backend/modules/branch/README.md` — Şube kapsam & API kontratı
* `backend/modules/menu/README.md` — Category/Item/Variant/Modifier/Combo/Availability
* `backend/modules/orders/README.md` — Cart/Order statü akışları & fiyat kırılımı
* `backend/modules/delivery/README.md` — Bölge/kurye/rota kuralları
* `backend/modules/kds/README.md` — Ticket/station akışları
* `backend/modules/dinein/README.md` — Tables/QR politikaları
* `backend/modules/coupons/README.md` — Kupon kuralları & örnek senaryolar
* `backend/modules/inventory/README.md` — Stok/recipe/purchasing metodolojisi
* `backend/modules/integrations/README.md` — Payment/aggregator/webhook sürücüleri
* `backend/modules/reports/README.md` — KPI’lar & dashboard metrikleri

---

İstersen sıradaki adımda **Faz 1 kapsamını** sprint’e bölüp (örn. “Menü CRUD”, “Sepet & Sipariş”, “Temel Ödeme & Fiş”), her bir modül için **API kontratı** (endpoint listesi, request/response şemaları, hata anahtarları) çıkaralım; yine kod yazmadan ilerleriz.
