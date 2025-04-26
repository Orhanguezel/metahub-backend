---

# 📚 Comment Module (Yorum Modülü) API Dökümantasyonu

---

## 🌍 Public Routes (Kayıt ve Listeleme)

### ➕ Create Comment  
**POST** `/api/comments/`

| Alan | Tip | Zorunlu | Açıklama |
|:-----|:----|:--------|:---------|
| name | string | ✅ | Kullanıcı adı (2-50 karakter) |
| email | string | ✅ | Kullanıcı e-posta adresi (geçerli format) |
| comment | string | ✅ | Yorum içeriği (5-500 karakter) |
| contentType | string | ✅ | İçerik türü (`blog`, `product`, `service`) |
| contentId | string (ObjectId) | ✅ | Yorum yapılacak içerik ID'si |

🛡️ **Validasyon Hataları:** 422 - Validation Error  
✅ **Başarılı:** 201 - Yorum başarıyla kaydedildi. Admin onayı bekliyor.

---

### 🔍 Get Comments for Specific Content  
**GET** `/api/comments/:type/:id`

| Parametre | Açıklama |
|:----------|:---------|
| type | İçerik tipi: `blog`, `product`, `service` |
| id | İçerik ID'si (MongoDB ObjectId) |

✅ Sadece **yayınlanmış (published)** ve **aktif (active)** yorumları listeler.  
🛡️ **Validasyon:** `type` ve `id` kontrol edilir.

---

## 🔒 Admin Routes (Admin ve Moderator Yetkisi Gerekir)

> Authentication + Role Authorization (`admin`, `moderator`) zorunludur.

### 📋 Get All Comments
**GET** `/api/comments/`

✅ Tüm yorumları listeler. İster yayınlanmış ister yayınlanmamış tüm yorumlar gelir.  
(Sıralama: En yeni yorumlar en üstte)

---

### ✏️ Toggle Comment Publish Status
**PUT** `/api/comments/:id/toggle`

| Parametre | Açıklama |
|:----------|:---------|
| id | Yorum ID'si |

🛡️ **Validasyon:** Yorum ID kontrol edilir.  
✅ Yayınlama durumunu tersine çevirir (published/unpublished).

---

### 🗑️ Soft Delete Comment
**DELETE** `/api/comments/:id`

| Parametre | Açıklama |
|:----------|:---------|
| id | Yorum ID'si |

✅ Yorumu silmez; **isActive: false** yaparak **arşivler**.  
Bu sayede yorum tamamen kaybolmaz, yönetim panelinde görünmez.

---

## 📋 Response Yapısı

Tüm başarılı cevaplar aşağıdaki formattadır:

```json
{
  "success": true,
  "message": "Comment created successfully.",
  "data": { ... }
}
```

Tüm hata cevapları aşağıdaki formattadır:

```json
{
  "success": false,
  "message": "Validation error.",
  "errors": [ { "field": "Error message" } ]
}
```

---

# 🎯 Özel Notlar
- Tüm içerikler için yorum yapılabilir: Blog / Ürün / Hizmet
- Admin/Müdür kullanıcılar yorumları yönetebilir
- `comment.validation.ts` ile sıkı validasyon uygulanıyor
- Injection ve spam riskleri minimuma indirildi
- Soft delete yapıldığı için veritabanında iz kalır (güvenlik için iyi)

---

# 🚀 Hazırız Kralım!

İstersen sıradaki adım olarak:

✅ `comment.models.ts` ve `comment.controller.ts` dosyalarına **küçük iyileştirmeler** (örneğin email normalization gibi) yapabiliriz,  
✅ veya başka modüle (örneğin **feedback** ya da **contact message**) geçebiliriz.

---