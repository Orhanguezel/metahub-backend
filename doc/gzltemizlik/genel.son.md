müthiş — güncel duruma göre **gzl** tenant’ı için “Apartment Management” dokümantasyonunu tek sayfada toparladım. Aşağıdaki metni repo’da `docs/metahub-gzl-apartment-management.md` gibi bir dosya olarak koyabilirsin. Her modül için: **amaç**, **model(ler)**, **kilit alanlar & index’ler**, **ilişkiler / populate reçetesi**, **temel endpoint’ler** ve “Apartment Yönetimi” ekranında hangi veriden neyi gösterdiğimiz yer alıyor.

> Not: Fiyat & periyot bilgisi **Apartment**’ta tutulmaz; **Contracts (+ PriceList)** ve **Billing/Invoices/Payments** üzerinden gelir. Populate reçetelerini bu yüzden vurguladım.

---

# MetaHub · gzl · Apartment Management (Rev. 2025-08-13)

## 0) Ortak standartlar

* **Multi-tenant:** Tüm koleksiyonlarda `tenant` zorunlu, sorgularda da (API tarafı `getTenantModels`).
* **Tarih & kimlik:** `createdAt`, `updatedAt` (Mongoose timestamps), `_id` ObjectId (FE’de string).
* **i18n:** Metinler `Record<locale,string>`. Anahtarlar `namespace.key`.
* **Para:** `amount:number` + `currency:"TRY"|"EUR"|...` (tutarlar net; vergi/stopaj ileride).
* **Eventler:** Örn. `contract.created/updated`, `invoice.sent/paid`, `jobs.assigned`, `job.finished`.
* **Index:** `(tenant, business-key)` şeklinde bileşik index’ler; metin arama alanlarına `text`/regex.

---

## 1) Apartment (core master data)

**Amaç:** Apartman kimliği + adres/konum + yönetici snapshot’ı + operasyon bağları (ekip/şablon referansları).

**Model:** `apartment`

* İçerik: `title{i18n}`, `content{i18n}`, `images[]`
* URL/tenant: `tenant`, `slug` (unique with tenant)
* Konum: `address{city,country,zip,fullText}`, `location{type:"Point",coordinates:[lng,lat]}`
* Normalize: `place{neighborhood?, cityCode?, districtCode?, zip?}`, `snapshots{neighborhoodName?}`
* İlişkiler:

  * `customer` (yönetim/işveren, **Contact/Organization**)
  * `contact` (snapshot: `name, phone, email, role, customerRef?`)
* Operasyon:

  * `ops{ employees[], supervisor?, services[], cleaningPlan?, trashPlan?, cashCollectionDay?, notify{...} }`
* Durum: `isPublished`, `publishedAt?`, `isActive`
* **Index:**

  * `{tenant,slug}` unique
  * `location: "2dsphere"`
  * `tenant + isPublished + isActive`, `tenant + place.neighborhood`, `address.fullText` text
  * `tenant + ops.*` (çalışan/süpervizör/servis/cashDay)

**Populate reçetesi (admin detay):**

```txt
place.neighborhood(name,slug)
customer(companyName,contactName,email,phone)
contact.customerRef(companyName,contactName,email,phone)
ops.employees(fullName,email,phone,role)
ops.supervisor(fullName,email,phone,role)
ops.services.service(code,name,unit,defaultDuration)
ops.services.schedulePlan(name,rrule,timezone)
ops.services.operationTemplate(name,steps)
```

**Neyi nereden gösteriyoruz (Apartment Yönetimi ekranı):**

* **Yönetici bilgisi:** `apartment.customer` (populated) + `apartment.contact` snapshot
* **Hizmet listesi:** `apartment.ops.services[].service` (isim/kod)

  > **Fiyat/Periyot değil!** Bunlar **Contracts/PriceList** tarafında.
* **Ücret/Periyot:** `contracts.lines[]` (amount, currency, period)
* **Tahsil günü:** `contracts.billing.dueDayOfMonth` (varsayılan).
* **Son fatura / ödeme:** `invoices` & `payments` (aşağıda).

**Temel endpoint’ler (admin):**

* `GET /apartment/admin` (filtreler: neighborhood, customer, employee, supervisor, service, cashDay, q, nearLng/Lat/Radius…)
* `GET /apartment/admin/:id` (yukarıdaki populate ile)
* `POST /apartment/admin` (multipart: images\[], contact.name zorunlu)
* `PUT /apartment/admin/:id` (parça parça update, images ekle/sil)
* `DELETE /apartment/admin/:id`

---

## 2) Apartment Category

**Model:** `apartmentcategory`

* `tenant`, `slug`, `name{i18n}`, `order?`, `isActive`
* **Index:** `{tenant,slug}` unique

**Endpoint:** CRUD (admin list/detail).

---

## 3) Service Catalog

**Model:** `servicecatalog`

* `tenant`, `code` (business key), `name{i18n}`, `unit?`, `defaultDuration?`, `defaultTeamSize?`, `isActive`
* **Index:** `{tenant,code}` unique; `name.*` aramada

**Kullanım:**

* `apartment.ops.services[].service` referansı
* `contracts.lines[].serviceCode?` veya doğrudan `serviceRef?` (tercihinize göre)

---

## 4) Contacts (Organizations/Persons)

**Model:** `contacts`

* `tenant`, `type:"org"|"person"`, `companyName?`, `contactName?`, `email?`, `phone?`, `billingInfo?`, `iban?`, `taxNo?`, `address?`
* **Index:** `{tenant,type}`, `{tenant,email}`, `{tenant,phone}` (opsiyonel unique)

**Kullanım:** `apartment.customer` + `apartment.contact.customerRef`.

---

## 5) Contracts

**Model:** `contracts`

* `tenant`, `apartmentId`, `customerId?`
* `status: "draft"|"active"|"paused"|"ended"`
* `startAt`, `endAt?`
* `lines[]`: `{ name, serviceCode?, amount, currency, period: "monthly"|"weekly"|"quarterly"|"yearly" }`
* `billing`: `{ dueDayOfMonth: number }`
* **Index:** `{tenant,apartmentId,status}`, `{tenant,startAt}`, `{tenant,lines.serviceCode}`

**Event:** `contract.created|updated` → billing/plan üretici tetik.

**Endpoints:** CRUD + list(filter by apartmentId, status, active at date).

---

## 6) Billing (Plans & Occurrences)

**Modeller:**

* `BillingPlan` — Sözleşmeye bağlı tekil plan meta.
* `BillingOccurrence` — Her dönem için üretilecek (veya üretilmiş) fatura kopyası gibi “instance”.

**Alanlar kabaca:**

* `BillingPlan`: `tenant, contractId, dueDayOfMonth, nextRunAt?`
* `BillingOccurrence`: `tenant, contractId, period{from,to}, dueAt, status:"planned"|"invoiced"`, `invoiceId?`

**Job:** Günlük/haftalık cron → aktif contract’lar için “gelecek dönem” occurrence/draft üretimi.

---

## 7) Invoicing

> (Model import örneğinde görünmüyor; modül bitti dediğin için dokümanda yer veriyoruz.)

**Model (özet):** `invoice`

* `tenant, apartmentId, contractId, period{from,to}, total, currency, status:"draft"|"sent"|"paid"|"overdue"`
* `lines?[]` (opsiyonel detay), `sentAt?`, `paidAt?`
* **Index:** `{tenant,apartmentId,period.from}`, `{tenant,status}`

**Endpoint:** CRUD + `POST /invoices/:id/mark-sent`, `POST /invoices/:id/mark-paid`.

---

## 8) Payments

**Model:** `payment`

* `tenant, invoiceId, date, amount, currency, method:"cash"|"bank"|...`
* **Davranış:** Toplam ödeme = invoice.total ⇒ invoice.status=`paid` (reconcile)
* **Index:** `{tenant,invoiceId}`, `{tenant,date}`

**Endpoint:** CRUD; “create” sonrası reconcile.

---

## 9) Price List

**Modeller:** `PriceList`, `PriceListItem`

* `PriceList`: `tenant, code/slug, name{i18n}, currency, isActive`
* `PriceListItem`: `tenant, listId, serviceCode|serviceId, period, amount`
* **Unique guard (öneri):** `{tenant,listId,serviceKey,period}`

**Kullanım:** Sözleşme hazırlarken kalem fiyatlarını seçmek/öneri.

---

## 10) Cashbook (Basit defter)

**Modeller:** `CashAccount`, `CashEntry`

* `CashAccount`: `tenant, code, name, currency, balance`
* `CashEntry`: `tenant, accountId, type:"in"|"out", amount, date, ref{invoiceId?, expenseId?}, note?`
* **Davranış:** Create/Update/Delete entry → account.balance delta ile güncellenir.

---

## 11) Operation Templates

**Model:** `operationtemplate`

* `tenant, apartmentId, serviceCode|serviceId, recurrence(rrule|freq/byday), plannedDurationMin, plannedTeamSize, defaultAssignees[], active`
* **Index:** `{tenant,apartmentId,active}`, `{tenant,service*}`

**Kullanım:** Haftalık/günlük **Jobs** üretimi için kaynak.

---

## 12) Operations Jobs

**Model:** `operationjob`

* `tenant, apartmentId, templateId?, date, title, plannedDurationMin, plannedTeamSize, assignees[], status:"planned"|"in_progress"|"done"|"skipped", actualDurationMin?`
* **Index:** `{tenant,apartmentId,date}`, `{tenant,status}`, `{tenant,assignees}`

**Eventler:** `jobs.assigned`, `job.started/finished`.

---

## 13) Scheduling

**Model:** `scheduleplan` (ayrık tekrar planları için)

* `tenant, name, rrule, timezone`
* **Kullanım:** `apartment.ops.cleaningPlan`, `apartment.ops.trashPlan` ve servis bağları.

**Algoritma:** v1 greedy, kişi başı planlanan dakikayı dengeleme (rota yok).

---

## 14) Time Tracking

**Model:** `timeentry`

* `tenant, jobId, employeeId, minutes, date`
* **Index:** `{tenant,jobId}`, `{tenant,employeeId,date}`

**Rapor:** Planlanan vs gerçekleşen süre, maliyet (employee.hourlyCost ile).

---

## 15) Employees

**Model:** `employee`

* `tenant, fullName, email?, phone?, role?, weeklyCapacityMin?, hourlyCost?, isActive`
* **Index:** `{tenant,fullName(email)} text/search`, `{tenant,isActive}`

**Kullanım:** `apartment.ops.employees/supervisor`, `jobs.assignees`, `timeentry.employeeId`.

---

## 16) Expenses

**Model:** `expense`

* `tenant, date, apartmentId?, type:"wage"|"material"|"fuel"|"other", amount, currency, note?`
* **Index:** `{tenant,date}`, `{tenant,apartmentId}`

**Not:** Personel saat maliyeti raporda hesaplanabilir: `sum(timeentry.minutes) * hourlyCost`.

---

## 17) Reports

**Modeller:** `ReportDefinition`, `ReportRun`

* `ReportDefinition`: `tenant, code, name{i18n}, paramsSchema?`
* `ReportRun`: `tenant, reportCode, params, status, rows?, startedAt, finishedAt`

**Örnek raporlar:**

* Apartman bazlı **Gelir–Gider–Kârlılık**
* Servis bazlı/haftalık **Adam-saat**
* **Alacaklar** yaşlandırma

---

## 18) Files

**Model:** `fileobject`

* `tenant, kind:"image"|"pdf"|"csv"|..., originalName, mime, size, url, thumbnail?, webp?, publicId?`
* **Kullanım:** Apartment images, sözleşme PDF, iş fotoğrafları…
* **Silme:** Soft delete alanı önerilir (`deletedAt?`).

---

## 19) “Apartment Yönetimi” — Veri Toplama Reçetesi

**Amaç:** Bir apartmanın yönetici/hizmet/fiyat/tahsilat/periyot özetini tek ekranda göstermek.

**1) Detay:**
`GET /apartment/admin/:id`  → *yukarıdaki populate setiyle*

* Yönetici kartı: `customer` (org/person) + `contact` snapshot
* Operasyon: ekip (employees/supervisor), bağlanan servisler + plan adları

**2) Sözleşme & Fiyat:**

* `GET /contracts?apartmentId=:id&status=active`
  → `lines[].{name, serviceCode, amount, currency, period}`
  → `billing.dueDayOfMonth` (tahsil günü)

**3) Faturalar (son 3 ay):**

* `GET /invoices?apartmentId=:id&from=YYYY-MM-01`
  → son durumlar (`draft|sent|paid|overdue`), dönem (`period{from,to}`)

**4) Ödemeler (son 90 gün):**

* `GET /payments?apartmentId=:id&dateFrom=...`
  → son tahsilatlar (amount, date, method)

> İpucu: Bu 3–4 çağrıyı FE’de **parallel** çalıştırıp “Yönetim Paneli” ekranını besleyin. Sık erişiliyorsa tek bir “aggregate endpoint” de yaratılabilir (ör. `/apartment/admin/:id/dashboard`).

---

## 20) Kısa API Özetleri (pattern)

Her modülde admin uçları aynı kalıpta:

* **List:** `GET /{module}/admin`
  Parametreler: `page, limit, q, isActive, ...modül özel filtreler...`
* **Detail:** `GET /{module}/admin/:id`
* **Create:** `POST /{module}/admin`
* **Update:** `PUT|PATCH /{module}/admin/:id`
* **Delete:** `DELETE /{module}/admin/:id`

> **Auth/RBAC:** Şimdilik admin zorunlu. Tenant izolasyonu middleware ile garanti.

---

## 21) Index & Performans Notları

* Apartment: `2dsphere` index; yakınlık aramalarında `nearRadius` ≤ birkaç km.
* Contracts/Invoices/Payments: `(tenant, apartmentId, date/period)` index’leri raporlar için kritik.
* Jobs/Time entries: `(tenant, date)` ve `(tenant, assignees/employeeId)` index’leri haftalık panoda hız sağlar.

---

## 22) Test Kapsamı (özet)

* **Unit:** helpers (i18n merge, money format), validators (ObjectId, day ranges).
* **Integration:** tenant-scoped API + populate doğrulaması.
* **E2E (kritik akış):** Contract → Billing → Invoice → Payment; Template → Jobs → Time Entry → Report.

---

## 23) Yol Haritası (artık “tamamlananlar” sonrası)

* **Workers (cron/queue):** billing occurrence üretimi, invoice due/overdue uyarıları, weekly job generate.
* **Audit Log:** write-ops diff snapshot.
* **Price Lists** & **Cashbook** (aktif; import & export uçları eklenebilir).
* **RBAC:** alan/endpoint bazlı roller.
* **Observability:** tracing/metrics/health.

---

### Ek: Modül import referansı (kodda kullandığın isimlerle)

```ts
import { Apartment } from "@/modules/apartment/models";
import { Neighborhood } from "@/modules/neighborhood/models";
import { BillingPlan, BillingOccurrence } from "@/modules/billing/models";
import { Contract } from "@/modules/contracts/models";
import { OperationJob } from "@/modules/operationsjobs/models";
import { OperationTemplate } from "@/modules/operationstemplates/models";
import { ReportRun, ReportDefinition } from "@/modules/reports/models";
import { SchedulePlan } from "@/modules/scheduling/models";
import { TimeEntry } from "@/modules/timetracking/models";
import { Employee } from "@/modules/employees/models";
import { Expense } from "@/modules/expenses/models";
import { ServiceCatalog } from "@/modules/servicecatalog/models";
import { Contact } from "@/modules/contacts/models";
import { PriceList, PriceListItem } from "@/modules/pricelist/models";
import { CashAccount, CashEntry } from "@/modules/cashbook/models";
import { FileObject } from "@/modules/files/models";
```

> Bu isimler dokümantasyondaki başlıklarla birebir eşleşecek şekilde yazıldı; her dosyanın README’sine bu sayfaya link koymanı öneririm.

---

İstersen bunu parçalara ayırıp repo’da:

```
/docs/modules/apartment.md
/docs/modules/contracts.md
...
```

olarak modül modül de çıkarırım. Ayrıca “Apartment Yönetimi” ekranı için tek bir **aggregate endpoint** (`/apartment/admin/:id/dashboard`) taslağını da yazabilirim; ham verileri tek çağrıda FE’ye verir.
