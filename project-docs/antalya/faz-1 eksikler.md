kısa özet: **Faz-1 tamamen bitmiş değil.** Aşağıda kapsama göre durumları ayırdım: **✅ tamam**, **🟡 kısmi**, **⛔ eksik**.

---

## Durum Özeti

**0) README’ler**

* ⛔ Modül README’leri (branch/menu/orders/payments/invoicing/notifications/reports) henüz yazılmadı.

**1) Ortak sözleşme**

* ✅ `x-tenant` ve i18n mesaj anahtarları var.
* 🟡 Response zarfı çoğu yerde var ama liste uçlarında **meta (page/limit/total)** her yerde dönmüyor ve **varsayılan sort/page/limit** global değil.

**2) Branch**

* 🟡 Şube doğrulaması ve servis tipi kontrolü siparişte var.
* ⛔ Admin CRUD ve **public `/public/branches`** ile **`/:id/availability`** uçları (temel açık/kapalı) görünmüyor.

**3) Menü & Katalog**

* ✅ `menuitem` + `variant` + `modifier` akışı ve fiyatlandırma (PriceListItem katalog) çalışıyor.
* 🟡 **min/max & required** modifier kuralları BE tarafında zorlanmıyor (yalnızca seçim yapınca var-yok kontrolü var).
* ⛔ Category/availability CRUD ve **public filtreli liste** (saat penceresiyle) dokümantasyondaki şekilde tamam değil.
* 🟡 `taxRate`/vergi tarafı şimdilik pasif (dokümanda Faz-1 basit geçiyor, sorun yok).

**4) Cart / Order-Draft**

* 🟡 Sepet modülü var ama **bike/ensotekprod/sparepart** odaklı.
  Dokümandaki “menu sepet satırı (variant+modifier snapshot’lı)” uçlar yok:
  `POST /cart/items`, `PATCH /cart/items/:lineId`, `PATCH /cart/pricing` vb.
* (Siparişe doğrudan geçişiniz çalışıyor; ama Faz-1 sözleşmesi “cart → checkout” akışı istiyor.)

**5) Orders**

* ✅ `POST /orders` (menuitem fiyatlama, e-posta tetikleri) çalışıyor.
* 🟡 Durum akışı mevcut ama **allowed transitions** kuralı net zorlanmıyor; **public tracking** token’lı uç yok.
* 🟡 Admin listesi/detayı bazı populate’lar kısmi (branch/payments özetleri).

**6) Payments (MVP)**

* 🟡 Online seçimde Payment dokümanı oluşturuluyor (pending).
* ⛔ **Admin manuel ödeme ekleme** (`POST /admin/payments {orderId, method, amount}`) ve
  **tam iade** (`POST /admin/payments/:id/refund`) uçları yok.

**7) Invoicing (MVP fiş)**

* ✅ Fatura modeli ve admin CRUD/Status var.
* ⛔ **`{ orderId }` ile fiş üret** uç noktası yok; “ödeme paid → fiş üret” tetikleyicisi de yok.
* ⛔ PDF/indirme linki dokümana göre opsiyonel ama henüz bağlanmamış.

**8) Notifications**

* ✅ `order.created` → müşteri + admin e-posta gidiyor.
* ⛔ `order.status.(confirmed|ready|delivered)` bildirimleri yok;
  ⛔ `POST /admin/notifications/test` uç noktası yok.

**9) Reports**

* ⛔ Günlük satış/top ürün/servis türü dağılımı uçları yok.

**10) Kabul Kriterleri**

* 🟡 Menüler görünüyor ama **availability & modifier min/max** BE zorlaması eksik.
* 🟡 Cart/Total kriteri: sepet aşaması eksik olduğu için kısmi.
* 🟡 “Ödeme kaydı → paid → fiş” zinciri otomatik değil.
* ⛔ Raporlar yok.

**11) Test Senaryoları**

* 🟡 PriceList/Items testleri geçti (harika). Diğer HP/V senaryoları için uçlar eksik (cart, reports, notifications status vb.)

**12) Sprint Planı uyumu**

* Sprint 1: Menü büyük ölçüde hazır; availability/public uçları eksik.
* Sprint 2: Sepet akışı eksik; sipariş başlangıcı ve created mail ✅.
* Sprint 3: Payments (manuel), Invoicing (orderId), Reports ⛔.

**13) NFR**

* ✅ Çoğu koleksiyonda indeksleme (tenant vs.) mevcut.
* 🟡 Rate limit ve bazı public uçların minimal alan seti standardizasyonu eksik.
* 🟡 RequestId/log context iyi; rapor/metrik uçları yok.

---

## Faz-1’i kapatmak için “minimum kapanış listesi”

1. **Menu availability & public liste**

   * `GET /public/menucategories`, `GET /public/menuitems?categoryId=&q=` (saat uygunluk filtresiyle).
   * Admin availability CRUD.

2. **Modifier kuralları**

   * BE’de `minSelect/maxSelect/isRequired` zorlaması (order/cart validators + fiyatlayıcıda guard).

3. **Cart (menu) uçları**

   * `POST /cart/items`, `PATCH /cart/items/:lineId`, `DELETE /cart/items/:lineId`, `PATCH /cart/pricing`, `POST /cart/checkout`.

4. **Payments (manuel)**

   * `POST /admin/payments` (tam tutar), `POST /admin/payments/:id/refund` (tam iade).

5. **Invoicing bağlayıcı**

   * `POST /admin/invoices { orderId }` → siparişten fiş oluştur.
   * Payment `paid` olduğunda otomatik fiş üret (opsiyonel webhook/service event).

6. **Notifications (status)**

   * `order.status.confirmed|ready|delivered` e-posta/sms (şablon alanlarıyla).
   * `POST /admin/notifications/test`.

7. **Reports**

   * `GET /admin/reports/sales/daily`
   * `GET /admin/reports/products/top`
   * `GET /admin/reports/service-type-share`

8. **Branch public & availability**

   * `GET /public/branches` ve `GET /public/branches/:id/availability`.

9. **Response zarfı standardizasyonu**

   * Liste uçlarında `meta { page, limit, total }` + varsayılan `?page=1&limit=20&sort=createdAt:desc`.

---

### Ne yapalım?

* Eğer **Faz-1’i “dokümantasyona birebir uyumlu” kapatmak istiyorsak**, yukarıdaki 9 maddelik mini backlog’u tamamlayalım.
* “Operasyonel olarak yeterli, Faz-2’ye akabiliriz” diyorsanız da olur; ancak **Cart(menu), Payments(manuel), Invoicing(orderId), Notifications(status), Reports** Faz-2 için bağımlılık/raporlama açısından kritik kalemler—erken eklemek sonradan daha az maliyetli.

İstersen önce **Cart(menu) + Payments(manuel) + Invoicing(orderId)** üçlüsünü bitirip (1 sprint), ardından Faz-2’ye geçelim; böylece Faz-1 kapanışı net olur.
