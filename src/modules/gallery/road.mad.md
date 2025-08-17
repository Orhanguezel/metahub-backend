
---

### 🚀 Geliştirme Planı (Roadmap)

---

✅ **1. Thumbnail ayarı (.env veya config)**

* `.env` → `THUMBNAIL_WIDTH`, `THUMBNAIL_HEIGHT`, `THUMBNAIL_QUALITY`
* `sharp` ile bu değerleri kullan

---

✅ **2. Kategori bazlı sıralama / öncelik**

* Model → `order` (kategori içi)
* Opsiyonel → `priority` (global öncelik)
* Controller → sıralama: `{ category, order }`

---

✅ **3. Soft delete geri yükleme**

* Yeni endpoint:
  `PATCH /gallery/:id/restore` → `isActive = true`

---

✅ **4. Batch işlemler**

* Çoklu publish/unpublish:
  `PATCH /gallery/batch/publish` → body: `[id1, id2, id3]`
* Çoklu silme:
  `DELETE /gallery/batch` → body: `[id1, id2, id3]`

---

✅ **5. Search ve filtreleme**

* Query parametreler:

  * `?search=title_en:team`
  * `?isPublished=true&isActive=true`
* Controller → `regex` + `filter` ile arama

---

✅ **6. Kullanım istatistikleri (dashboard)**

* Endpoint:
  `GET /gallery/stats`
* Response:

```json
{
  "total": 50,
  "byCategory": {
    "hero": 10,
    "gallery": 5,
    "products": 20
  },
  "published": 40,
  "archived": 10
}
```

---

✅ **7. Multilingual fallback desteği**

* Controller → response içinde fallback

```js
item.title[preferredLang] || item.title.en || item.title.tr || item.title.de
```

---

✅ **8. Webp optimizasyon**

* Thumbnail + Webp versiyonu
* Örnek:
  `gallery/thumbnails/123.webp`

---

### 📦 Çalışma sırası

1. Model güncellemesi
2. Controller fonksiyonları
3. Yeni route’lar
4. Yeni validation’lar
5. Middleware (sharp + webp)
6. Test & Postman export

---

