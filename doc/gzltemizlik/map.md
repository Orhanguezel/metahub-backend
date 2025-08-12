# Yol Haritası — “Apartment as a Product” Mimarisine Geçiş

Aşağıdaki plan; mevcut **apartment**, **apartmentcategory**, **service**, **notifications** modülleri üzerine, yeni modülleri **aşamalı** ve **riski düşük** şekilde kurar. Her faz, *bitince üretime alınabilir* (“incremental delivery”).

---

## 0) Mimari Hazırlık (Hafta 0)

**Hedef:** Ortak altyapıyı kur, kararları sabitle.

* **Shared paketleri:** `/core` (utils, validation), `/types` (ID, Money, Period, Recurrence), `/ui` (Form, Table, Pagination), `/hooks`.
* **Domain events:** Basit event-bus (ör. `emit("contract.created", payload)`); consumer’lar: billing, notifications.
* **Job scheduler:** `bullmq` veya `node-cron` (örn. `billing:generate-invoices-daily`).
* **RBAC & Audit:** Minimal roller (admin, ops, finance), `audit_log` hook’ları.
* **i18n standardı:** `namespace.key` konvansiyonu; her modüle JSON.

> Çıktı: ortak kütüphaneler, event bus, scheduler, tema ile uyumlu UI bileşenleri.

---

## 1) Apartment “Core” Temizliği (Hafta 1)

**Hedef:** Apartmanı yalınlaştır, fiyat/operasyon alanlarını dışarı taşı.

* **Schema sadeleştirme:** `apartment` yalnızca **içerik, adres/konum, kategori, contact** tutar.
* **Migration:** Eski `services/fees` alanları (varsa) read-only snapshot olarak dump et (rapor için saklanabilir).
* **Admin UI:** Mevcut sayfaları küçük UX düzeltmeleri (responsive/pagination tamam).

> Çıktı: İnce “master data” **apartment**.

---

## 2) Contacts (Opsiyonel İnceleme, Hafta 1-2)

**Hedef:** Yönetim/işveren kartlarını netleştir.

* **Schema:** `contacts` (person/organization), ödeme bilgisi (bank, IBAN), default due day opsiyonel.
* **UI:** Basit CRUD + arama; apartman → contact seçimi.

> Çıktı: Apartmanlar tekilleştirilmiş müşterilere bağlanabilir.

---

## 3) Service Catalog ✅ (Var) → İnce Ayar (Hafta 2)

**Hedef:** Operasyon & fiyatlandırma temelini standardize et.

* **Alanlar:** `code`, `name(i18n)`, `defaultDurationMin`, `defaultTeamSize`.
* **Index:** `tenant+code` unique.

> Çıktı: Tüm operasyon ve sözleşme kalemleri bu katalogtan referanslanır.

---

## 4) Contracts (Sözleşmeler) (Hafta 3)

**Hedef:** Fiyat ve periyotların tek kaynağı.

* **Schema:** `contract { apartmentId, status, startAt, endAt, lines[], billing{dueDayOfMonth} }`.
* **UI:** Apartment detayında “Sözleşme” sekmesi. Çizelge: satır adı/servis, tutar, period (monthly/weekly/…), para birimi.
* **Event:** `contract.created/updated` (billing’e tetik).

> Çıktı: Gelir kalemleri ve tahsil günleri standartlaştı.

---

## 5) Billing (Plan Üretici) (Hafta 4)

**Hedef:** Fatura üretim planlarını otomatikle.

* **Job:** Günlük cron → aktif sözleşmeler için “gelecek dönem” faturaları üret (draft).
* **Kurallar:** `dueDayOfMonth`, `period` → `periodStart/End` hesapla.
* **UI:** “Billing queue / drafts” listesi (filtre: ay, apartment).

> Çıktı: Otomatik **invoice draft**’ları.

---

## 6) Invoicing (Faturalama) (Hafta 4)

**Hedef:** Faturalar ve statü yönetimi.

* **Schema:** `invoice { apartmentId, contractId, period{from,to}, total, currency, status }`.
* **Aksiyonlar:** draft→sent→paid/overdue; PDF (opsiyonel), e-posta (notifications ile).
* **UI:** Fatura listesi, detay, “Mark as paid”.

> Çıktı: Standart fatura yaşam döngüsü.

---

## 7) Payments (Tahsilatlar) (Hafta 5)

**Hedef:** Ödeme kayıtları ve mutabakat.

* **Schema:** `payment { invoiceId, date, amount, method }` (kısmi ödeme destekli).
* **Otomatik mutabakat:** Toplam ödemeler = invoice total ⇒ status=paid.
* **Rapor:** Alacaklar listesi, yaşlandırma.

> Çıktı: Gerçek gelir takibi.

---

## 8) Operations — Templates (Hafta 6)

**Hedef:** Tekrarlayan iş şablonları.

* **Schema:** `work_template { apartmentId, serviceCode, recurrence, plannedDurationMin, teamSize, defaultAssignees[] }`.
* **Recurrence:** Haftalık (BYDAY) ve “her gün pazar hariç” gibi basit kurallar.
* **UI:** Apartment detayında “Operasyon Şablonları”.

> Çıktı: Operasyon planının kaynağı.

---

## 9) Operations — Jobs/Work Orders (Hafta 7)

**Hedef:** Şablondan somut işler.

* **Job üretimi:** Haftalık batch (pazartesi 00:00) → ilgili haftanın işleri.
* **Schema:** `job { date, apartmentId, templateId, assignees[], plannedDurationMin, status }`.
* **UI:** Haftalık pano (takvim/kanban), durum değişimi.

> Çıktı: Çalışılacak iş listesi.

---

## 10) Scheduling (Temel) (Hafta 8)

**Hedef:** 5 personeli dengeli dağıt.

* **Algoritma (v1):** Basit greedy – kişi başı planlanan dakika eşitleme (rota/mesafe yok).
* **UI:** “Auto-assign” butonu + manuel sürükle-bırak (opsiyonel).
* **Event:** `jobs.assigned` → notifications.

> Çıktı: Haftalık ekip planı 1 tıkla.

---

## 11) Time-Tracking (Hafta 9)

**Hedef:** Adam-dakika & maliyet ölçümü.

* **Schema:** `time_entry { jobId, employeeId, minutes, date }`.
* **UI:** Hızlı giriş (mobil uyumlu), “başlat/durdur” veya manuel dakika.
* **Raporlama:** Planlanan vs gerçekleşen süre.

> Çıktı: İş gücü verisi → maliyet.

---

## 12) Employees (Hafta 9)

**Hedef:** Kapasite ve maliyet.

* **Alanlar:** `weeklyCapacityMin`, `hourlyCost`, aktif/pasif.
* **UI:** CRUD + izin günleri (opsiyonel v2).

> Çıktı: Scheduling ve maliyet için kaynak verisi.

---

## 13) Expenses (Hafta 10)

**Hedef:** Giderlerin kaydı.

* **Schema:** `expense { date, apartmentId?, type, amount, currency, note }`.
* **UI:** Basit kayıt (yakıt, malzeme, diğer; iş emrine bağlama opsiyonel).
* **Otomasyon:** Personel saat maliyeti = `time_entry * hourlyCost` (rapor tarafında hesaplanabilir).

> Çıktı: Gider tabanı.

---

## 14) Reports (Hafta 11)

**Hedef:** Kârlılık ve operasyon verimi.

* **Raporlar:**

  * Apartman bazlı **Gelir – Gider – Kârlılık**.
  * Servis bazlı/haftalık **Adam-saat**.
  * Personel **verimlilik**.
  * **Alacaklar** yaşlandırma.
* **Export:** CSV (ilk aşama).

> Çıktı: Yönetim görünürlüğü.

---

## 15) Notifications ✅ (Var) → Kural Seti (Hafta 11-12)

**Hedef:** Olay tabanlı bildirimler.

* **Tetikler:** `invoice.dueSoon`, `invoice.overdue`, `jobs.assigned`, `job.started/finished`.
* **Kanallar:** e-posta; ileride WhatsApp/Push.

> Çıktı: Proaktif bilgilendirme.

---

## Çapraz Konular

* **Test:** Unit (schema, utils), Integration (API), E2E (kritik akışlar: sözleşme → fatura → ödeme).
* **Index & performans:** `tenant` composite index’ler; tarih aralıkları için index; sayfalama limitleri.
* **Güvenlik:** RBAC, tenant isolation; tüm sorgularda `tenant` zorunlu.
* **Veri taşıma:** Eski `fees/services` → `contract.lines` olarak migrate script (opsiyonel).
* **Dokümantasyon:** Her modül için README: schema, endpoints, i18n anahtarları, UI akışları.

---

## Önerilen Takvim (esnek)

* **Hafta 0–1:** Hazırlık + Apartment temizliği
* **Hafta 2–5:** Contracts → Billing → Invoicing → Payments
* **Hafta 6–9:** Operations Templates → Jobs → Scheduling → Time-Tracking & Employees
* **Hafta 10–12:** Expenses → Reports → Notifications kuralları

> Her hafta sonunda canlıya küçük parçalar: (1) Sözleşme+Fatura, (2) Operasyon Planı, (3) Raporlar.

---

## Başlamak için “Done” Tanımı (Faz 1)

* [ ] Apartment sade.
* [ ] Service katalog stabil.
* [ ] Contract CRUD + event yayınlıyor.
* [ ] Billing cron draft invoice üretiyor.
* [ ] Invoice listesinde “Mark as paid” çalışıyor.

Bunları onaylarsan; önce **Contracts + Billing + Invoicing** için schema ve API’leri çıkarayım, ardından admin UI iskeletlerini ekleyelim.
