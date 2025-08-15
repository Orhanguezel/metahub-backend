`docs/modules/scheduling.md`

---

# MetaHub · gzl · **Scheduling** Modülü (Rev. 2025-08-13)

> **Amaç:** Apartman/servis/şablon/sözleşme bağlamında **tekrarlayan iş planları** tanımlamak ve belirlenen kurallara göre **Operation Jobs** üretimini tetiklemek (cron/worker ile).

---

## 0) Ortak Standartlar

* **Multi-tenant:** Tüm kayıtlar `tenant` scoped; tüm API çağrılarında **`x-tenant: gzl`** zorunlu.
* **Zaman & Kimlik:** `createdAt`, `updatedAt` (timestamps), `_id` = ObjectId (FE’de string).
* **i18n:** `TranslatedLabel` (örn. `title`, `description`) — FE’de `useI18nNamespace("scheduling", translations)`.
* **Saat & TZ:** Varsayılan `Europe/Istanbul`. (v1 hesaplamada timezone alanı tutulur; ileri sürümde tam TZ-aware hesaplama yapılacak.)
* **Yanıt kuralı:** `res.status(...).json(...); return;`

---

## 1) Model(ler)

### 1.1 `scheduleplan`

**Amaç:** Tekrarlayan plan tanımı; bağlam (anchor), tekrar paterni, gün içi pencere ve üretim politikası.

**Alanlar (özet):**

* `tenant: string` — **zorunlu**
* `code: string` — **business key**, `(tenant, code)` **unique**; boş gelirse otomatik `SCH-YYYY-xxxxxx`
* `title?: TranslatedLabel`, `description?: TranslatedLabel`
* `anchor: { ... }` — **zorunlu**, işin bağlamı

  * `apartmentRef: ObjectId` (**gerekli**)
  * `categoryRef?: ObjectId` (şu an **neighborhood** ref’i)
  * `serviceRef?: ObjectId` (**servicecatalog**)
  * `templateRef?: ObjectId` (**operationtemplate**)
  * `contractRef?: ObjectId` (**contract**)
* `timezone?: string` (default: `Europe/Istanbul`)
* `pattern: RecurrencePattern` (**union**)

  * `{ type:"weekly"; every:number>=1; daysOfWeek:number[] /*0..6*/ }`
  * `{ type:"dayOfMonth"; every:number>=1; day:1..31 }`
  * `{ type:"nthWeekday"; every:number>=1; nth:1..5; weekday:0..6 }`
  * `{ type:"yearly"; month:1..12; day:1..31 }`
* `window?: { startTime?: "HH:mm"; endTime?: "HH:mm"; durationMinutes?: number>=0 }`
* `policy?: { leadTimeDays?: number>=0; lockAheadPeriods?: number>=0; autoAssign?: boolean; preferredEmployees?: ObjectId[]; minCrewSize?: number>=1; maxCrewSize?: number>=1 }`
* `startDate: Date` (**gerekli**), `endDate?: Date`
* `skipDates?: Date[]` (tekil istisnalar), `blackouts?: { from:Date; to?:Date; reason?:string }[]` (aralık istisnaları)
* `lastRunAt?: Date`, `nextRunAt?: Date` (bir sonraki kontrol), `lastJobRef?: ObjectId` (**operationjob**)
* `status: "active" | "paused" | "archived"` (default: `active`)
* `tags?: string[]`

**Index’ler:**

* `(tenant, code)` **unique**
* `(tenant, status, nextRunAt)`
* `(tenant, anchor.apartmentRef, status)`
* `(tenant, anchor.serviceRef, status)`

---

## 2) İş Kuralları & Validasyon

**Anchor (zorunlu):**

* `apartmentRef` **zorunlu** ve **ObjectId** olmalı.
* `categoryRef`, `serviceRef`, `templateRef`, `contractRef` mevcutsa **ObjectId** olmalı.

**Pattern (union) kontrolleri:**

* `type` ∈ `["weekly","dayOfMonth","nthWeekday","yearly"]`
* `weekly`: `every>=1`, `daysOfWeek` dizi ve her eleman `0..6`
* `dayOfMonth`: `every>=1`, `day ∈ 1..31` (otomatik **clamp**: Şubat’ta 30/31 → ayın son gününe)
* `nthWeekday`: `every>=1`, `nth ∈ 1..5`, `weekday ∈ 0..6` (ayda yoksa sonraki döneme kayar)
* `yearly`: `month ∈ 1..12`, `day ∈ 1..31` (geçmişse otomatik bir sonraki yıla)

**Window & Policy:**

* `durationMinutes>=0`
* `leadTimeDays>=0`, `lockAheadPeriods>=0`
* `minCrewSize, maxCrewSize >=1` (**Not:** v1’de `min<=max` kontrolü zorunlu değil; FE’de uyarı önerilir)

**Tarih Alanları:**

* `startDate` ISO8601 zorunlu; `endDate` opsiyonel
* `skipDates` / `blackouts` **array** olmalı

**Status:** `active|paused|archived`

**Tenant izolasyonu:** Tüm CRUD & listlerde **`tenant: req.tenant`** filtresi.

---

## 3) İlişkiler & Populate Reçetesi (minimal seçkiler)

Aşağıdaki ilişkiler **UI’de dinamik bağ** için önerilen `select` alanlarıdır:

```txt
anchor.apartmentRef(title, place.neighborhood, ops.supervisor)
anchor.categoryRef(name, slug)                 // neighborhood; ileride apartmentcategory olabilir
anchor.serviceRef(code, name, unit, defaultDuration)
anchor.templateRef(name, plannedDurationMin, plannedTeamSize)
anchor.contractRef(status, startAt, endAt, billing.dueDayOfMonth)
policy.preferredEmployees(fullName, email, phone, role, isActive)
lastJobRef(date, status, assignees)            // operationjob
```

> **Not:** FE’de seçim listeleri dinamik:
> *Service* → **ServiceCatalog**; *Template* → **OperationTemplate** (filtre: `apartmentRef`, `serviceRef`);
> *Contract* → **Contract** (filtre: `apartmentId`, `status=active`);
> *PreferredEmployees* → **Employee** (filtre: `isActive`, tercihen apartmanın ekibi).

---

## 4) `nextRunAt` Hesap Mantığı (v1)

* **Otomatik `code`:** `pre("validate")` içinde `SCH-YYYY-xxxxxx`.
* **`pre("save")`:** `status:"active"` ve `nextRunAt` boşsa **pattern**’a göre **ilk uygun tarih** hesaplanır:

  * `weekly`: `daysOfWeek` içinde en yakın gün
  * `dayOfMonth`: bu ayın `day`; geçmişse `every` ay ileri
  * `nthWeekday`: bu ayın `nth`.`weekday`; yoksa `every` ay ileri
  * `yearly`: bu yılın (ay/gün); geçmişse gelecek yıl
* **Skip & Blackout:** Aday tarih `skipDates`/`blackouts`’a denk gelirse **bir gün ileri** denenir.
* **Saat:** Aday tarih saatleri v1’de **09:00** olarak setlenir (gün içi pencere görsel amaçlı).
* **Timezone:** Alan tutulur; ileri sürümde offset hesaplamasına dahil edilecektir.

---

## 5) REST API (Admin)

> Tüm uçlar `authenticate + authorizeRoles("admin","moderator")`; **header**: `x-tenant: gzl`

### 5.1 List

`GET /scheduling/admin`

* **Query:**
  `q, status, apartmentRef, serviceRef, templateRef, contractRef, tag, from, to, limit=200 (<=500)`
* **Filtre Kuralı:**

  * `q` → `code`, `title.tr`, `title.en` regex
  * `from/to` → `startDate` aralığı
  * Diğerleri ObjectId doğrulamaları
* **Sıralama:** `createdAt:desc`
* **Dönüş:** `data: ISchedulePlan[]`

### 5.2 Detail

`GET /scheduling/admin/:id`

* `:id` **ObjectId**; bulunamazsa **404**

### 5.3 Create

`POST /scheduling/admin`

* **Body:** JSON veya form-data (nested alanlar için `transformNestedFields`)
* **Zorunlu:** `anchor`, `pattern`, `startDate`
* **Validasyon:** Yukarıdaki union/alan kontrolleri
* **Dönüş:** `201 Created` + yeni plan

### 5.4 Update

`PUT /scheduling/admin/:id`

* Kısmi güncelleme; nested alanlar JSON-string gelebilir (`transformNestedFields`)
* `id` geçersizse **400**, bulunamazsa **404**

### 5.5 Delete

`DELETE /scheduling/admin/:id`

* Başarılıysa `200` + mesaj

---

## 6) UI — “Dinamik Bağ” Rehberi (kod yok, akış)

1. **Plan Listesi (Admin):**
   Filtreler: `status`, `apartment`, `service`, `template`, `contract`, `tag`, `from/to`, `q`.
   Varsayılan `limit=200`, `createdAt:desc`.

2. **Plan Oluştur/Düzenle Formu:**

   * **Anchor → Apartment (zorunlu)** seçimi → diğer alanları **filtrele**:

     * **Service**: ServiceCatalog listesi (opsiyonel)
     * **Template**: OperationTemplate listesi (filtre: apartment + service)
     * **Contract**: Contract listesi (filtre: `apartmentId`, `status=active`)
   * **Pattern**: `weekly | dayOfMonth | nthWeekday | yearly` switch ile ilgili alanları göster.
   * **Window**: `startTime/endTime/durationMinutes`
   * **Policy**: `leadTimeDays`, `lockAheadPeriods`, `autoAssign`, `preferredEmployees` (multi-select), `min/maxCrewSize`
   * **İstisnalar**: `skipDates[]`, `blackouts[{from,to,reason}]`
   * **Önizleme (öneri):** İlk 3–5 **olası tarih** (v1 hesap).

3. **Plan Detayı:**

   * `nextRunAt`, `lastRunAt`, `lastJobRef` (link: Operation Job detayı)
   * Bağlı **Contract billing day** ve **Apartment ops supervisor** hızlı erişim (read-only)

---

## 7) İş Üretimi — Entegrasyon (taslak, worker’lık)

> Kod kapsam dışı; akış **cron/queue** için rehberdir.

1. **Seçim:** `status:"active"` ve `nextRunAt <= now` planlarını çek.
2. **Üretim:** Pattern/Window/Policy’e göre hedef tarih(ler) için **OperationJob** oluştur:

   * `apartmentId=anchor.apartmentRef`, `templateId=anchor.templateRef?`, `title=service/name`,
     `plannedDurationMin=window.durationMinutes ?? template.default`,
     `plannedTeamSize=policy.minCrewSize ?? template.teamSize`
3. **Atama:** `autoAssign===true` ise `preferredEmployees` içinden kapasiteye göre ata (v2).
4. **Güncelleme:** `lastRunAt=now`, `nextRunAt=bir sonraki aday` (skip/blackout uygulayarak).
5. **Sınırlar:** `endDate` varsa aşılmasın; `lockAheadPeriods` kadar ileri üretim.

---

## 8) Örnek İstekler (Postman/cURL)

### 8.1 Create — Haftalık Pazartesi/Çarşamba

```bash
curl -X POST "$BASE/scheduling/admin" \
 -H "Content-Type: application/json" \
 -H "x-tenant: gzl" \
 -H "Authorization: Bearer $TOKEN" \
 -d '{
  "anchor": { "apartmentRef": "66b1c0f0e6a6c1f58d3d1e11", "serviceRef": "66b1c11ae6a6c1f58d3d1e12" },
  "pattern": { "type": "weekly", "every": 1, "daysOfWeek": [1,3] },
  "window": { "startTime": "09:00", "durationMinutes": 120 },
  "policy": { "leadTimeDays": 2, "lockAheadPeriods": 1, "minCrewSize": 2 },
  "startDate": "2025-08-01",
  "status": "active",
  "title": { "tr": "Genel Temizlik", "en": "General Cleaning" }
 }'
```

### 8.2 Create — Ayın 30’u (clamp: 28/29/30/31 fark etmez)

```bash
curl -X POST "$BASE/scheduling/admin" \
 -H "Content-Type: application/json" \
 -H "x-tenant: gzl" \
 -d '{
  "anchor": { "apartmentRef": "66b1c0f0e6a6c1f58d3d1e11" },
  "pattern": { "type": "dayOfMonth", "every": 1, "day": 30 },
  "startDate": "2025-08-01"
 }'
```

### 8.3 List — Filtreli

```bash
curl -G "$BASE/scheduling/admin" \
 -H "x-tenant: gzl" \
 --data-urlencode "status=active" \
 --data-urlencode "apartmentRef=66b1c0f0e6a6c1f58d3d1e11" \
 --data-urlencode "limit=100"
```

---

## 9) Hata Durumları (i18n anahtarlarıyla)

* `400 invalidId` — `/:id` geçersiz
* `400 validation.*` — anchor/pattern/policy/window/dates/arrays hataları
* `404 notFound` — kayıt bulunamadı
* `500 error.create_fail` — create sırasında beklenmedik hata

> Mesajlar modülün `i18n`’ından gelir; FE’de ham metin yazma.

---

## 10) Performans & Index Notları

* **Job üretimi** için `(tenant, status, nextRunAt)` kritik.
* Sorgularda **apartment/service** bazlı filtre için `(tenant, anchor.apartmentRef, status)` ve `(tenant, anchor.serviceRef, status)` index’leri hazır.
* Liste uçlarında default: `limit<=200 (max 500)`, `createdAt:desc`.

---

## 11) Test Kapsamı (özet)

**Happy Path:**

* `weekly` plan oluştur (`daysOfWeek:[1,3]`) → `201` + `nextRunAt` dolu.
* Listele `status=active` → yeni plan listede, `tenant` filtresi doğru.

**Edge / Validasyon:**

* `anchor.apartmentRef` yok → `400 validation.anchorRequired`
* `pattern.type="nthWeekday"` fakat `nth=6` → `400 validation.nth`
* `dayOfMonth=31` ve `startDate=2025-02-01` → `nextRunAt` **Şubat sonuna** clamp’lenmiş olmalı.

---

## 12) UI/FE Notları

* **Form-data** gönderiminde nested alanları stringle (`transformNestedFields` destekli):

  * `title`, `description`, `anchor`, `pattern`, `window`, `policy`, `skipDates`, `blackouts`, `tags`
* **Slice/Thunk:** Mevcut `apiCall` ile; **`x-tenant` otomatik**. `res` zaten payload ( `res.data` **kullanma** ).
* **i18n:** `scheduling.form.*`, `scheduling.list.*`, `scheduling.errors.*` gibi namespace anahtarları.

---

## 13) Yol Haritası (Scheduling v2)

* **TZ-aware** `nextRunAt` (IANA TZ ile lokal saatten UTC’ye doğru dönüşüm)
* **RRULE destekli** karmaşık tekrarlar (örn. `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE`)
* **Auto-assign** akıllı atama: kapasite/rota/servis süresi dengesi
* **Plan “preview” API**: ilk N gerçekleşecek tarih + “skip/blackout” simülasyonu
* **Lock-ahead** periyot üretimi: canlıya yakın “takvim dökümü” export

---

### Ek: “Apartment Yönetimi” ile Köprü

* `apartment.ops.services[].schedulePlan` alanları yerine, **Scheduling** modülü tek kaynak.
* “Apartment Yönetimi” panelinde planlar, **`GET /scheduling/admin?apartmentRef=:id&status=active`** ile listelenebilir.
* Fiyat & periyot **Contracts/Billing** tarafındadır; Scheduling yalnızca **iş planlamayı** temsil eder.

---

**Dosya:** `docs/modules/scheduling.md`
**Güncelleme:** 2025-08-13 · **Tenant:** gzl · **Sahip:** Apartment Management Core Team
