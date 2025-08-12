harika—RBAC’i şimdilik pas geçiyoruz. Apartment paketi, konuştuğumuz kapsamla **tamam**. 🎯
Kapanış için kısa bir “go-live” kontrol listesi ve önerilen smoke test akışlarını bırakıyorum:

## Go-live kontrol listesi (BE)

* **Tenant header**: `x-tenant` interceptor aktif (FE) + `getTenantModels` içinde yeni modeller (ServiceCatalog, Contacts, PriceList/Item, CashAccount/Entry, Files) kayıtlı.
* **ENV**: `STORAGE_PROVIDER`, `UPLOAD_ROOT`, `BASE_URL`, Cloudinary/S3 key’leri, cron env’leri (şimdilik pasif kalabilir).
* **Index & autoIndex**: prod’da `autoIndex=false` ise bir defa `syncIndexes()` script’i çalıştır (tüm yeni koleksiyonlar için).
* **Upload whitelist**: CSV/XLSX dahil (cashbook/pricelist import için); yeni klasör anahtarları FE/BE uyumlu.
* **i18n**: oluşturma/update’de `fillAllLocales` + `mergeLocalesForUpdate` her yerde aynı pattern.
* **Güvenlik**: mevcut `authenticate + authorizeRoles` tüm admin router’larda var.
* **Logs**: logger çıktıları (info/warn/error) ve request context sahada okunaklı.

## Go-live kontrol listesi (FE)

* **API çağrıları yalnız slice/hook** (talimatlara uygun).
* **i18n zorunlu**: tüm label/metinler modül i18n JSON’larından geliyor.
* **Tema & tenant**: favicon/asset yolları tenant’a duyarlı; `x-tenant` header kesin.
* **Files**: yeni upload noktalarında `uploadTypeWrapper("files")` ile uyumlu istek akışı.

## Hızlı smoke test senaryoları

1. **Service Catalog**

   * Create (code: `TRASH`), list, update (tags, defaultDuration), deactivate, search by `name.xx`.
2. **Contacts**

   * Org + Person oluştur, slug otomatik; primary email/phone tekilleşiyor mu bak.
3. **Price List**

   * List create (`DEFAULT_TR`), item ekle (`TRASH`, monthly), duplicate guard (tenant+list+service+period unique) çalışıyor.
4. **Cashbook**

   * Account create (TRY), manual entry in/out, update entry (delta balance), delete entry (balance geri alınıyor), reconcile & unreconcile.
5. **Files**

   * Çoklu upload (image+pdf+csv), preview/webp (image) üretimi, link/unlink (ör. apartment’a bağla), soft delete.
6. **Contracts → Billing → Invoicing → Payments**

   * Sözleşme oluştur, draft invoice üretimi, mark as sent/paid, payment → invoice reconcile (varsa).
7. **Operations**

   * Template → Jobs generate (haftalık), assign, timetracking ekle, raporlar çalışıyor mu.

## Bilinen “sonra bakarız”

* Audit Log (gerekmiyor dedin, pas).
* RBAC (geniş kapsam, şimdilik yok).
* Workers/Queues (billing/schedule/report): iskelet hazırsa env kapalı; sonra açarız.
* OpenAPI/Postman: Faz 1.5 kapanışında tek koleksiyon olarak export edelim.

## Önerilen sıradaki ufak iyileştirme

* **Import** uçları (CSV/XLSX) için: PriceList ve Cashbook’a basit import endpoint’i (sonra).
* **FE “file picker”**: Files modülündeki link/unlink’i kullanan ortak seçici (opsiyonel).
Harika—güncel duruma göre **tested** modülleri işaretledim, **Apartment**’ı “henüz test edilmedi” notuyla **Pending** yaptım, tabloda **Price List** ve **Cashbook** satırlarını ekledim. Regression bölümünü de yalnız **testi geçen** modüllerle sınırladım.

---

# MetaHub — Apartment (Product)

## Smoke Tests (Sprint Scope: **Employees**)

**Tarih:** 11 Aug 2025 (Europe/Berlin)
**Çevre:** Staging/Prod (multi-tenant)
**Not:** Bu sürümde *Employees* modülü devreye alınacak. Aşağıdaki “Pending” modüller kapsam dışı.

---

## 0) Pre-Flight (Global)

* [ ] **Tenant header:** Tüm isteklerde `x-tenant: <tenantSlug>` gidiyor.
* [ ] **Auth:** Admin kullanıcı ile giriş yapılmış, cookie/session aktif.
* [ ] **Base URL:** `https://<env>/api` (FE→BE yolları doğrulandı).
* [ ] **Locales:** i18n namespace’leri yüklü (en/tr/de…); FE metinler hardcode değil.
* [ ] **Indexes:** Yeni koleksiyonlar için index’ler senkron (autoIndex=false ise `syncIndexes()` yapıldı).
* [ ] **Time & Currency:** Varsayılan para birimi ve tarih formatı tenant’a uygun.

---

## 1) Modül Durum Matrisi

| Modül                      | Durum     | Not                            |
| -------------------------- | --------- | ------------------------------ |
| Apartments                 | ⏳ Pending | **Henüz test edilmedi**        |
| Apartment Categories       | ⏳ Pending |                                |
| Contacts/Organizations     | ✅ Tested  | Org/Person                     |
| Service Catalog            | ✅ Tested  | code, i18n name, defaults      |
| Contracts                  | ✅ Tested  | CRUD (fiyat/periyot saklama)   |
| Billing                    | ✅ Tested  | Plan üretimi & akış doğrulandı |
| Invoicing                  | ⏳ Pending | Kapsam dışı                    |
| Payments                   | ⏳ Pending | Kapsam dışı                    |
| **Price List**             | ✅ Tested  | Tarife setleri                 |
| **Cashbook**               | ✅ Tested  | Nakit defteri                  |
| **Files**                  | ⏳ Pending | Kapsam dışı                    |
| **Operations — Templates** | ⏳ Pending | Kapsam dışı                    |
| **Operations — Jobs**      | ⏳ Pending | Kapsam dışı                    |
| **Reports**                | ⏳ Pending | Kapsam dışı                    |
| **Scheduling**             | ⏳ Pending | Kapsam dışı                    |
| **Time Tracking**          | ⏳ Pending | Kapsam dışı                    |
| **Employees**              | 🚧 Next   | Bu sprintte devreye alınacak   |

> Not: “✅ Tested” satırları Postman regresyon setinde **geçti**.

---

## 2) Regression (Mevcut, Kısa Koşu — **yalnız geçerli modüller**)

> Amaç: Employees devreye alınmadan önce **başarılı** modüllerin hâlâ çalıştığını hızlıca doğrulamak.

* **Service Catalog**

  * [ ] Unique `(tenant, code)` koruması.
  * [ ] Default süre/ekip güncellemesi listede yansıyor.

* **Contacts/Organizations**

  * [ ] Org & Person create → list → update → delete.
  * [ ] Slug/primary iletişim alanları beklendiği gibi.

* **Contracts**

  * [ ] Satır ekle/sil/güncelle (period, amount, currency).
  * [ ] Status: `active → paused → active`.
  * [ ] Tarih doğrulamaları: `endAt ≥ startAt`.

* **Billing**

  * [ ] Aktif sözleşmeden dönemsel plan/draft üretimi.
  * [ ] Draft’lar doğru period aralığı ile oluşuyor.

* **Price List**

  * [ ] Liste create, item ekle (service+period).
  * [ ] Duplicate guard (tenant+list+service+period).

* **Cashbook**

  * [ ] Hesap create (TRY/EUR), entry in/out.
  * [ ] Update/delete entry sonrası bakiye tutarlılığı.

> **Apartments** modülü bilinçli olarak bu turda **koşulmuyor** (henüz test edilmedi).

---

## 3) **Employees** — Smoke Test (Yeni Modül)

### 3.1 Endpoint’ler

* `GET   /employees?q=&isActive=&page=&limit=`
* `POST  /employees`
* `PATCH /employees/:id`
* `DELETE /employees/:id`
* (Ops.) `POST /employees/import` (CSV)

### 3.2 CRUD & Doğrulamalar

* [ ] **Create (happy path)**
  Body: `name`, `email?`, `phone?`, `roles?[]`, `weeklyCapacityMin?`, `hourlyCost?`, `daysOff?[]`, `isActive=true`
  **Beklenen:** 201; dönende `tenant` doğru; `createdAt`/`updatedAt` set.
* [ ] **Create (validation)**

  * [ ] Negatif `weeklyCapacityMin` reddedilir.
  * [ ] Negatif `hourlyCost` reddedilir.
  * [ ] `daysOff` enum dışı değer reddedilir.
  * [ ] (Ops.) `email` unique (tenant scoped) ise çakışma 409/422.
* [ ] **Read/List**

  * [ ] `GET /employees` default sıralama & pagination.
  * [ ] `q` parametresi `name` üzerinde arar.
  * [ ] `isActive=false` filtresi yalnız pasifleri döndürür.
* [ ] **Update (partial patch)**

  * [ ] `isActive: false` → filtre ile doğrula.
  * [ ] `weeklyCapacityMin` güncelle → response yansır.
  * [ ] `daysOff` güncelle → enum kontrolü.
* [ ] **Delete**

  * [ ] Soft/Hard stratejine uygun 200/204; listeden kaybolur.
* [ ] **Tenant izolasyonu**

  * [ ] Farklı tenant ile erişim 404/403.

### 3.3 Filtre & Sıralama

* [ ] `GET /employees?q=ayse` → yalnız eşleşen kayıtlar.
* [ ] `GET /employees?isActive=true` → yalnız aktifler.
* [ ] (Ops.) `sort=createdAt:desc` destekleniyorsa doğrula.

### 3.4 Kapasite & Maliyet Alanları (veri tutarlılığı)

> *Scheduling/TimeTracking henüz yok; burada yalnız veri bütünlüğü kontrol edilir.*

* [ ] `weeklyCapacityMin` aralık kontrolü (ör. 0–10080).
* [ ] `hourlyCost` ondalık precision (2–4) korunur.

### 3.5 Güvenlik & Hata Senaryoları

* [ ] Auth yokken tüm uçlar 401.
* [ ] Yanlış `x-tenant` → 404 (isolation).
* [ ] Şema dışı alan → yok say/422 (stratejiye göre).

### 3.6 (Opsiyonel) CSV Import

* [ ] Başlıklar: `name,email,phone,weeklyCapacityMin,hourlyCost,daysOff,isActive`.
* [ ] Boş satır/tekrarlı email davranışı net (skip/fail).
* [ ] Kısmi başarı raporu (inserted/failed).

---

## 4) Kapsam Dışı (Skip)

* **Apartments**, **Apartment Categories**, **Invoicing**, **Payments**, **Files**,
  **Operations — Templates**, **Operations — Jobs**, **Reports**, **Scheduling**, **Time Tracking**.

> Not: Employees alanları (*weeklyCapacityMin*, *hourlyCost*, *daysOff*) ileride **Scheduling** ve **Time Tracking** ile entegre edilecek; şimdilik CRUD yeterli.

---

## 5) Çıkış Kriterleri (Sprint)

* [ ] Employees CRUD + filtre + validasyonlar **yeşil**.
* [ ] Tenant izolasyonu ve auth kuralları **yeşil**.
* [ ] Postman koleksiyonunda **Employees** klasörü eklendi; ortam değişkenleri (`baseUrl`, `tenant`, `auth`) güncel.
* [ ] Smoke raporu (bu dosya) PR’a eklendi.

---

## 6) Ek Notlar

* FE tarafında **API çağrıları yalnız slice/hook**; i18n/tema kuralları release öncesi checklist ile kontrol edilir.
* Employees devreye alındıktan sonra sıradaki sprintte **Scheduling/Time Tracking** minimal entegrasyon testleri planlanacaktır.

---

Hazırsa bunu `docs/smoke-tests-apartment.md` olarak PR’a ekleyebilirim. Postman koleksiyon başlıklarını da aynı hiyerarşiyle ister misin?


import { Apartment } from "@/modules/apartment/models";
import { ApartmentCategory } from "@/modules/apartmentcategory/category.models";
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
