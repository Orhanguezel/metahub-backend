# PriceList Module — Backend Report

> Scope: This documents the server-side of the **PriceList** module (lists + items), including data model, relations, validations, normalization, endpoints (admin & public), filters, and typical flows. It’s multi-tenant and i18n-aware.

---

## 1) Data Model

### 1.1 PriceList (`pricelist`)

**Purpose:** Container for price definitions; effective window + status control which lists are visible.

| Field                     | Type                              | Notes                                                                                                                                             |
| ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                     | ObjectId                          | Auto                                                                                                                                              |
| `tenant`                  | string                            | **Required**. Used in all queries & unique indexes.                                                                                               |
| `code`                    | string                            | **Required**. Normalized to **UPPER\_SNAKE\_CASE**; unique per `tenant` (`{tenant, code}` unique index). Auto-generated from `name` if empty.     |
| `name`                    | `TranslatedLabel`                 | i18n object: `{ en?: string, tr?: string, ... }`. Stored as full locale map; empty strings allowed. Text index on all locales for `$text` search. |
| `description`             | `TranslatedLabel`                 | i18n object (same structure).                                                                                                                     |
| `defaultCurrency`         | "USD" \| "EUR" \| "TRY"           | **Required**. Used as fallback for items with no currency.                                                                                        |
| `segment`                 | string                            | Optional business segment tag.                                                                                                                    |
| `region`                  | string                            | Optional region tag.                                                                                                                              |
| `apartmentCategoryIds`    | ObjectId\[]                       | Optional, ref: `"apartmentcategory"` (array).                                                                                                     |
| `effectiveFrom`           | Date                              | **Required**.                                                                                                                                     |
| `effectiveTo`             | Date?                             | Optional. Open interval if absent.                                                                                                                |
| `status`                  | "draft" \| "active" \| "archived" | Default `"draft"`. Indexed.                                                                                                                       |
| `isActive`                | boolean                           | Default `true`.                                                                                                                                   |
| `createdAt` / `updatedAt` | Date                              | Timestamps                                                                                                                                        |

**Indexes**

* Unique: `{ tenant: 1, code: 1 }`
* Filters: `{ tenant: 1, isActive: 1 }`, `{ tenant: 1, status: 1, effectiveFrom: 1 }`, `{ tenant: 1, region: 1, segment: 1 }`
* Text (multi-locale): `name.en`, `name.tr`, … (all supported locales)

**Normalization (pre-validate)**

* `code` → UPPER\_SNAKE (`spaces→_`, strip non `[A-Za-z0-9_]`, uppercased).
* If no `code`, derived from first non-empty `name[locale]` or `"PRICELIST"`.

---

### 1.2 PriceListItem (`pricelistitem`)

**Purpose:** A concrete price for a Service on a given billing period, under a specific list.

| Field                     | Type                                                       | Notes                                                                                        |
| ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `_id`                     | ObjectId                                                   | Auto                                                                                         |
| `tenant`                  | string                                                     | **Required**                                                                                 |
| `listId`                  | ObjectId                                                   | **Required**, ref: `"pricelist"`                                                             |
| `serviceCode`             | string                                                     | **Required**; normalized to **UPPER\_SNAKE\_CASE**. Intended to match `ServiceCatalog.code`. |
| `amount`                  | number                                                     | **Required**, `>= 0`                                                                         |
| `currency`                | "USD" \| "EUR" \| "TRY"                                    | Optional; falls back to parent list’s `defaultCurrency` in controller.                       |
| `period`                  | "weekly" \| "monthly" \| "quarterly" \| "yearly" \| "once" | **Required**                                                                                 |
| `notes`                   | string                                                     | Optional                                                                                     |
| `isActive`                | boolean                                                    | Default `true`                                                                               |
| `createdAt` / `updatedAt` | Date                                                       | Timestamps                                                                                   |

**Uniqueness**

* `{ tenant: 1, listId: 1, serviceCode: 1, period: 1 }` **unique**
  ➜ prevents duplicate definitions for the same service+period in a list.

**Useful index**

* `{ tenant: 1, serviceCode: 1, isActive: 1 }`

**Normalization (pre-validate)**

* `serviceCode` → UPPER\_SNAKE.

---

## 2) Relations

* **PriceListItem.listId → PriceList.\_id** (1\:N).
* **PriceList.apartmentCategoryIds → apartmentcategory.\_id** (N\:M tag-like).
* **PriceListItem.serviceCode ↔ ServiceCatalog.code** (string-based foreign key in UPPER\_SNAKE\_CASE).

> Design note: `serviceCode` avoids ObjectId coupling; integrity relies on code discipline. Frontend should source options from Service Catalog and enforce UPPER\_SNAKE.

---

## 3) i18n Behavior

* `name` / `description` are stored as **full locale maps** (every supported locale key present).
* Incoming partial payloads are normalized:

  * `fillAllLocales` ensures a full map on create.
  * `mergeLocalesForUpdate` merges non-empty locales on update without wiping other languages.
* A **text index** on all `name.<locale>` enables `$text` search with `q`.

---

## 4) Tenancy & Security

* All queries filter by `tenant` (from request context).
* **Admin routes** guarded by: `authenticate` + `authorizeRoles("admin","moderator")`.
* **Public routes** expose only **active** lists within the **effective window**.

---

## 5) Admin API

Base: `/admin/pricelists`

### 5.1 GET `/`

List price lists with filters.

**Query**

* `q`: text search (over all localized `name.*`)
* `status`: `draft|active|archived`
* `isActive`: `true|false`
* `region`: string
* `segment`: string
* `effectiveAt`: ISO date — returns lists where `effectiveFrom ≤ date ≤ effectiveTo || effectiveTo missing`

**Response**: `{ success, message, data: IPriceList[] }` (sorted by text score if `q` present, else `createdAt` desc)

---

### 5.2 GET `/:id`

Fetch a list + its items.

**Response**: `{ success, message, data: { list: IPriceList, items: IPriceListItem[] } }`

---

### 5.3 POST `/`

Create a price list.

**Body**

* `code?` (UPPER\_SNAKE; auto from `name` if omitted)
* `name` *(multilang object or JSON string)*
* `description?` *(multilang)*
* `defaultCurrency` **required**: `USD|EUR|TRY`
* `segment?`, `region?`
* `apartmentCategoryIds?`: `string[]` (ObjectId as string; can be JSON string)
* `effectiveFrom` **required** (ISO)
* `effectiveTo?` (ISO)
* `status?`: `draft|active|archived` (default `draft`)
* `isActive?` (default `true`)

**Notes**

* Middleware `transformNestedFields` lets you submit `name`, `description`, `apartmentCategoryIds` as JSON strings.
* Duplicate `(tenant, code)` → **409** with `error.duplicate`.

---

### 5.4 PUT `/:id`

Update a price list (partial).

**Body (any of)**
`code, name, description, defaultCurrency, segment, region, apartmentCategoryIds, effectiveFrom, effectiveTo, status, isActive`

**Merging**

* `name` / `description`: merged per-locale; empty/omitted locales remain unchanged.

---

### 5.5 DELETE `/:id`

Deletes the list **and** all its items (cascading in controller).

---

### 5.6 Items

Base: `/admin/pricelists/:listId/items`

#### GET `/`

Filter by:

* `serviceCode?` (UPPER\_SNAKE; sanitizer applied)
* `period?` (`weekly|monthly|quarterly|yearly|once`)
* `isActive?` (`true|false`)

#### POST `/`

Create item for a list.

**Body (required)**
`serviceCode` (UPPER\_SNAKE), `amount` (>=0), `period`
**Optional:** `currency` (falls back to parent list’s `defaultCurrency`), `notes`, `isActive`

**Uniqueness**: duplicate `(tenant,listId,serviceCode,period)` → **409**.

#### PUT `/:itemId`

Partial update; same validation as create.

#### DELETE `/:itemId`

Remove a single item.

---

## 6) Public API

Base: `/public/pricelists`

> Visibility rule used by all public endpoints:
> `isActive: true` AND `status: "active"` AND `effectiveFrom <= onDate` AND (`!effectiveTo` OR `effectiveTo >= onDate`)

### 6.1 GET `/`

List visible price lists.

**Query**: `region?`, `segment?`, `onDate?` (ISO)

---

### 6.2 GET `/code/:code`

Get a visible list (by code) **with items** (only active items).

---

### 6.3 GET `/code/:code/price?serviceCode=TRASH&period=monthly[&onDate=...]`

Quick lookup for a specific service price on a given period.
**Response:** `{ amount, currency, period }` or **404** if not found.

---

## 7) Validation Summary

* **ObjectId** checks on all `:id` params.
* **Code formats**: `code` and `serviceCode` must match `^[A-Z0-9_]+$` (enforced + sanitized to UPPER\_SNAKE).
* **Currencies/Period/Status**: constrained enums.
* **Dates**: ISO 8601.
* **Numbers**: `amount >= 0`.
* **Booleans**: parsed via `.toBoolean()`.

---

## 8) Typical Flows

### Create a Price List

1. POST `/admin/pricelists` with `name` (multilang), `defaultCurrency`, `effectiveFrom`, etc.
2. (Optional) Add items with POST `/admin/pricelists/:listId/items`.

### Activate a List for Public

* PUT `/admin/pricelists/:id` with `{ status: "active", isActive: true, effectiveFrom: "YYYY-MM-DD" }`.

### Change a Price

* PUT `/admin/pricelists/:listId/items/:itemId` (or create a new list for future dates and use `effectiveFrom`/`effectiveTo` strategy).

---

## 9) Error Handling

* **409** `error.duplicate` on unique collisions.
* **404** `notFound` / `error.not_found` when list/item not found or not visible.
* **400** for invalid ids / params.
* **500** `error.create_fail` / `error.update_fail` on unexpected failures.

---

## 10) Performance & Notes

* Text index improves `q` searches; prefer short terms.
* Admin list supports `effectiveAt` point-in-time filtering.
* Items are sorted by `createdAt desc`; consider adding `serviceCode` sorting as needed.
* Service relation is by **code**; ensure front-end enforces catalog-driven selection.

---

## 11) Open Integration Points

* **Apartment categories**: provide a selector fed by `apartmentcategory` collection; send array of ObjectId strings.
* **ServiceCatalog**: surface `code` list from service catalog; enforce UPPER\_SNAKE on UI.
* **i18n UX**: in admin UI, edit `name`/`description` per active locale; backend will merge locales safely.

---
