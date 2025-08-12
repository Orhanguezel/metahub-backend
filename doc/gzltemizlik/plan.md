harika fikir—tek “apartman” modülünü şişirmek yerine, **ürün (product) yaklaşımı** ile parçalayalım. “Ürünümüz: Apartman” olsun; etrafına sözleşme, fiyatlandırma, operasyon ve finans modülleri örülsün. Aşağıdaki yapı; anlaşılır, ölçeklenebilir ve her parçayı ayrı ayrı yönetilebilir kılar.

---

# Önerilen modül mimarisi

## 1) Çekirdek (Master Data)

* **Products / Apartments**

  * “Ürün tipi: apartment”. (Sizin mevcut `apartment` koleksiyonu burada kalır.)
  * Sade: i18n başlık, adres, konum, kategori, sorumlu kişi, aktif/publish.
* **Apartment Categories**

  * Mevcut modül.
* **Contacts & Organizations** *(opsiyonel ama tavsiye)*

  * Yönetim/işveren (firma/kişi), ödeme bilgileri, iletişim. Apartment `customerRef` buraya bağlanır.
* **Employees**

  * Personeller, roller, haftalık kapasite (dakika), ücret/saat tabanı, izin/bakım günleri.
* **Service Catalog**

  * “Çöp toplama, merdiven temizliği, çevre düzeni…” gibi **standart servisler**: kod, isim (i18n), varsayılan süre, varsayılan ekip büyüklüğü, notlar.

## 2) Ticari (Satış/Fiyatlandırma/Faturalama)

* **Contracts (Sözleşmeler)**

  * Her apartment için **tek veya birden çok** sözleşme.
  * Kalemler: servis adı/satır adı, tutar, para birimi, **periyot (monthly/weekly/…)**, başlangıç-bitiş.
* **Billing Plans (Abonelik benzeri plan)**

  * Sözleşmeden üretilecek faturalama planı: **dueDayOfMonth** (ayın 5’i gibi), gelecek faturaların programı.
* **Invoices (Faturalar)**

  * Plan’dan dönemlik fatura oluşturulur.
  * Durum: draft → sent → paid/overdue, tahsilat tarihi vs.
* **Payments (Tahsilatlar)**

  * Faturaya bağlı tahsilatlar (elde, EFT, vb.), kısmi ödeme desteği.
* **Price Lists** *(opsiyonel)*

  * İleride farklı tarife setleri için.

## 3) Operasyon (Planlama/İş Emri)

* **Work Templates (Tekrarlayan İş Şablonları)**

  * Apartment + Service + **RecurrenceRule** (ör: “Pazar hariç her gün”, “her Salı”) + planlanan süre + ekip sayısı + varsayılan atanmış personel(ler).
* **Jobs / Work Orders (İş Emirleri)**

  * Şablondan döneme açılan günlük/haftalık işler.
  * Alanlar: tarih, apartment, servis, planlanan süre/ekip, atanan personeller, durum.
* **Scheduling (Dağıtım)**

  * Haftalık plan üretici: toplam adam-dakika → 5 personel kapasitesine göre **dengeleyen atama**.
  * Çakışma kontrolü, rotaya/mahalleye göre gruplayarak atama (ileride).
* **Time Tracking**

  * Personel bazlı “gerçekleşen süre” (clock-in/out veya manuel giriş), iş maliyetini hesaplamak için.

## 4) Finans (Gider-Kârlılık)

* **Expenses (Giderler)**

  * Maaş/saat karşılığı (time tracking’den türetilebilir), yakıt, malzeme, diğer giderler. Apartment’a bağlanabilir.
* **Cashbook / Ledger (Basit Defter)**

  * İlk aşamada **tek girişli nakit defteri** yeterli; büyüyünce çift girişli muhasebe modülüne geçilebilir.
* **Reports**

  * Apartman bazlı gelir–gider–kârlılık, servis bazlı Adam-saat, personel verimlilik, alacaklar yaşlandırma.

## 5) Ortak & Yardımcı

* **Notifications / Automations**

  * “Ayın 5’i yaklaşırken” uyarı, “haftalık plan hazır” bildirimi, geciken iş/fatura alarmı.
* **Files & Docs** *(opsiyonel)*

  * Sözleşme PDF’i, fotoğraflar.
* **Audit Log**

  * Kim neyi ne zaman değiştirdi?

---

# Koleksiyon/entite taslakları (özet)

```ts
// products-apartment
type Apartment = {
  _id: string; tenant: string; slug: string;
  title?: Record<Locale,string>; address: Address; categoryId: string;
  contact: { name: string; phone?: string; email?: string; };
  isActive: boolean; isPublished: boolean;
};

// service-catalog
type Service = {
  _id: string; code: "TRASH"|"STAIRS"|"GARDEN"|"CUSTOM";
  name: Record<Locale,string>;
  defaultDurationMin: number;
  defaultTeamSize: number;
};

// contracts
type Contract = {
  _id: string; apartmentId: string; customerId?: string;
  startAt: Date; endAt?: Date; status: "active"|"paused"|"ended";
  lines: Array<{ name: string; serviceCode?: string; amount: number; currency: "TRY"|"EUR"; period: "monthly"|"weekly"|"quarterly"|"yearly"; }>;
  billing: { dueDayOfMonth: number; nextDueAt?: Date; };
};

// invoices & payments
type Invoice = { _id: string; apartmentId: string; contractId: string; period: { from: Date; to: Date; }; total: number; currency: string; status: "draft"|"sent"|"paid"|"overdue"; };
type Payment = { _id: string; invoiceId: string; date: Date; amount: number; method: "cash"|"bank"; };

// work templates & jobs
type WorkTemplate = {
  _id: string; apartmentId: string; serviceCode: string;
  recurrence: { freq: "weekly"|"monthly"; byDay?: Array<"MO"|"TU"|"WE"|"TH"|"FR"|"SA"|"SU">; interval?: number; };
  plannedDurationMin: number; plannedTeamSize: number;
  defaultAssignees?: string[]; active: boolean;
};

type Job = {
  _id: string; apartmentId: string; templateId: string;
  date: string; title: string; plannedDurationMin: number; plannedTeamSize: number;
  assignees: string[]; status: "planned"|"in_progress"|"done"|"skipped";
  actualDurationMin?: number;
};

// employees, time entries, expenses
type Employee = { _id: string; name: string; weeklyCapacityMin?: number; hourlyCost?: number; isActive: boolean; };
type TimeEntry = { _id: string; jobId: string; employeeId: string; minutes: number; date: string; };
type Expense = { _id: string; date: string; apartmentId?: string; type: "wage"|"material"|"fuel"|"other"; amount: number; currency: string; note?: string; };
```

> Hepsinde **tenant** alanı ortak olmalı; index’ler de buna göre.

---

# UI / Navigasyon (yönetim paneli)

* **Ürünler**

  * Apartments (liste/detay)
  * Apartment Categories
  * Contacts/Organizations *(opsiyonel)*
* **Katalog**

  * Service Catalog
* **Sözleşme & Faturalama**

  * Contracts (apartment detayından da eriş)
  * Billing Plans (sözleşme içinden)
  * Invoices & Payments
* **Operasyon**

  * Work Templates (apartment bazlı)
  * Jobs / Work Orders (takvim/haftalık görünüm)
  * Scheduling (Personel bazlı haftalık dağıtım)
  * Time Tracking (hızlı giriş ekranı)
* **Finans**

  * Expenses
  * Reports (Gelir–Gider, Kârlılık, Alacaklar)
* **Ayarlar**

  * Employees, Wage/Rate, Bildirimler

---

# Veri akışı (örnek: Samanyolu)

1. **Apartment**: Samanyolu Sitesi
2. **Contract**:

   * Lines: Merdiven 1.000 TRY (monthly), Çöp 3.000 TRY (monthly)
   * Billing: `dueDayOfMonth = 5`
3. **Work Templates**:

   * TRASH: MO–SA, 15 dk, ekip 2, Ayşe+Fatma
   * STAIRS: TU, 60 dk, ekip 3, Ayşe+Fatma+Hayriye
4. **Scheduler** haftalık **Jobs** üretir; personele atar.
5. Personel **Time Tracking** girer → **adam-dakika** & maliyet oluşur.
6. Ay dönünce **Invoice** kesilir, **Payment** alınır.
7. **Reports**: Samanyolu kârlılık = (faturalı gelir) − (zaman maliyeti + giderler).

---

# Klasör yapısı (Next.js / modules)

```
/modules
  /apartment
  /apartmentcategory
  /contacts
  /service
  /contracts
  /billing (plan üretici)
  /invoicing
  /payments
  /operations-templates
  /operations-jobs
  /scheduling
  /employees
  /time-tracking
  /expenses
  /reports
  /notifications
```

---

# Neden böyle?

* **Sorumluluk ayrımı**: Faturalama ile planlama birbirini çağırır ama aynı dokümana yazılmaz.
* **Basit evrim**: Önce sözleşme+fatura; sonra scheduling; sonra time tracking ve raporlar.
* **Performans**: İnce dokümanlar, doğru index’ler, kolay raporlama.

---

## Netleştirelim (kısa sorular)

1. Fatura tarafında **vergi/stopaj** gibi kalemler var mı; şimdilik **net tutar** yeter mi?
2. Ödemeler **kısmi** olabiliyor mu?
3. Personeller için **sabit haftalık kapasite** ve **saatlik maliyet** verecek miyiz?
4. “Planlanan iş zamanı” için **saat aralığı** gerekiyor mu (örn. çöp 08:00–11:00)?
5. Bu modülleri **ayrı koleksiyonlar** olarak açmamı onaylıyor musun (tercihim bu)?

“Evet” dersen, önce **Service Catalog + Contracts + Billing → Invoice/Payment** zincirini kodlayalım; paralelde **Work Templates + Jobs + Scheduling** için admin ekran iskeletlerini çıkarayım.
