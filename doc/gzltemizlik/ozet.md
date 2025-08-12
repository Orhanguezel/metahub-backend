Tamam, elimizdeki plan aslında tek “apartment” koleksiyonuna yüklenmiş karmaşık işleri parçalara ayırıp, ürün mantığıyla (Apartment = Product) etrafına modüller örerek hem teknik hem iş süreçlerini net bir şekilde yöneten bir yapı kurmayı hedefliyor.

Aşağıda hem **ne tür bir proje olacağı**, hem de **hangi işi hangi modülün yapacağı** ayrıntılı olarak anlatacağım. Ayrıca, modüller arası veri akışını ve geliştirme aşamalarını da belirteceğim.

---

## 1. Projenin Genel Amacı

Bu sistem, apartman yönetimi işlerini uçtan uca yöneten, **çok kiracılı (multi-tenant)**, modüler ve ölçeklenebilir bir platform olacak.
Ana ürünümüz **"Apartment"**, yani sisteme kayıtlı her apartman, tüm sözleşme, faturalama, operasyon ve finans süreçlerinin merkezinde yer alacak.

Amaç:

* **Yönetim kolaylığı:** Apartman, sözleşme, hizmet, personel, fatura, ödeme, operasyon planı gibi tüm süreçleri tek yerden yönetmek.
* **Modülerlik:** Her işlev kendi modülünde; bağımsız geliştirilebilir, test edilebilir, ölçeklenebilir.
* **Otomasyon:** Faturalama, iş planlama, bildirimler gibi tekrarlayan işleri otomatikleştirmek.
* **Raporlama:** Gelir-gider, kârlılık, personel verimliliği gibi yönetim kararlarını destekleyen raporlar.

---

## 2. Modül Bazlı Görevler

### **Çekirdek (Master Data)**

* **Apartment (Ürün):**

  * Temel bilgiler: başlık (çok dillidir), adres, konum, kategori, sorumlu kişi.
  * Durumlar: aktif / yayında.
  * **Yalnızca master data tutar**, operasyon veya fiyat bilgisi burada olmaz.
* **Apartment Categories:** Apartman tiplerini sınıflandırır.
* **Contacts / Organizations:** Apartman sahibini veya yönetimini temsil eder, iletişim ve ödeme bilgileri burada tutulur.
* **Employees:** Personel listesi, roller, kapasite, saatlik ücret, izin günleri.
* **Service Catalog:** Standart hizmetler (ör. çöp toplama, merdiven temizliği) süre, ekip büyüklüğü gibi varsayılan bilgilerle.

---

### **Ticari (Satış, Fiyatlandırma, Faturalama)**

* **Contracts:** Apartmana bağlı hizmet sözleşmeleri, kalemler (servis, fiyat, periyot), başlangıç-bitiş tarihleri.
* **Billing Plans:** Sözleşmelerden çıkan faturalama takvimi (ör. her ayın 5’i).
* **Invoices:** Planlara göre üretilen faturalar, durum (taslak, gönderildi, ödendi, gecikmiş).
* **Payments:** Faturaların tahsilat kayıtları (kısmi ödeme desteği).
* **Price Lists (opsiyonel):** Farklı tarife setleri tanımlamak.

---

### **Operasyon (Planlama, İş Emri)**

* **Work Templates:** Tekrarlayan iş şablonları (apartman + hizmet + tekrar kuralı).
* **Jobs / Work Orders:** Şablondan türetilen haftalık/günlük işler, personele atanır.
* **Scheduling:** Haftalık işlerin personel kapasitesine göre dengeli dağıtımı.
* **Time Tracking:** Personelin işlerde harcadığı süreyi kaydetmek, maliyet analizi yapmak.

---

### **Finans (Gider, Kârlılık)**

* **Expenses:** Maaş, malzeme, yakıt gibi giderler; apartmana veya operasyona bağlanabilir.
* **Cashbook / Ledger:** Basit gelir-gider defteri (ileride muhasebe modülüne evrilebilir).
* **Reports:** Apartman bazlı kârlılık, hizmet bazlı adam-saat, personel verimlilik, alacaklar yaşlandırma.

---

### **Ortak & Yardımcı**

* **Notifications / Automations:** Otomatik e-posta/SMS bildirimleri (fatura yaklaşırken, plan hazır olduğunda).
* **Files & Docs:** Sözleşme PDF’leri, operasyon fotoğrafları.
* **Audit Log:** Kim neyi ne zaman değiştirdi takibi.

---

## 3. Modüller Arası Veri Akışı (Örnek Senaryo)

1. **Apartment:** “Samanyolu Sitesi” kaydedilir.
2. **Contract:** Apartman için 2 hizmet eklenir: Merdiven temizliği (1000 TRY / ay), çöp toplama (3000 TRY / ay), ödeme günü her ayın 5’i.
3. **Billing:** Sistem her ayın başında bu sözleşmeden faturaları taslak olarak üretir.
4. **Invoice & Payment:** Faturalar gönderilir, ödemeler kaydedilir; tahsilat durumları güncellenir.
5. **Work Templates:** Çöp toplama haftada 6 gün, merdiven temizliği haftada 1 gün olarak planlanır.
6. **Jobs:** Şablonlardan haftalık iş listesi oluşur, personele atanır.
7. **Time Tracking:** Personel gerçek çalışma sürelerini girer; maliyet hesaplanır.
8. **Expenses:** Ek malzeme ve yakıt giderleri eklenir.
9. **Reports:** Apartmanın kârlılık raporu: (faturalı gelir) − (zaman maliyeti + giderler).

---

## 4. Geliştirme Aşamaları (Önerilen Yol Haritası)

* **Faz 1:** Apartment temizleme, Service Catalog, Contracts, Billing, Invoicing, Payments.
* **Faz 2:** Work Templates, Jobs, Scheduling, Employees, Time Tracking.
* **Faz 3:** Expenses, Reports, Notifications.
* **Faz 4:** Opsiyonel geliştirmeler (rota optimizasyonu, gelişmiş muhasebe, dosya yönetimi).

---

## 5. Teknik Prensipler

* **Multi-tenant destek:** Her tabloda `tenant` alanı ve ilgili index’ler.
* **Modüler yapı:** `/modules/{modul_adi}` klasörleri ile backend ve frontend paralel yapılar.
* **i18n desteği:** Tüm metin alanlarında çok dilli yapı (Record\<Locale, string>).
* **Event-driven:** contract.created → billing tetikleme, jobs.assigned → notification tetikleme.
* **Test & CI/CD:** Postman/Newman ile tenant-scoped API testleri, slice yazım standardı.

---

İstersen bir sonraki adımda bu planı **geliştirme rehberi formatında**, yani hem backend API hem frontend slice + UI akışı ile birlikte tek dokümanda genişletebilirim. Böylece “modül → endpoint → slice → UI” zinciri netleşir. Bu, hem geliştirme hem ekip onboarding sürecini çok hızlandırır.
