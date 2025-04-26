Harika! Hemen sana **Stockmovement** modülü için dökümantasyon (README tarzında) çıkarıyorum.  
Formatımız temiz ve uluslararası bir ekip için uygun olacak.

İşte **`stockmovement.md`** içeriği:

---

# 📦 Stockmovement Module Documentation

## Overview
This module manages **stock movement records** such as:
- Stock increases
- Stock decreases
- Manual adjustments
- Orders
- Returns
- Manual entries

All actions are **admin-protected** and require authentication.

---

## 🗂 Model: `Stockmovement`

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `product` | ObjectId (ref: Product) | ✅ | Related product ID |
| `type` | Enum | ✅ | Movement type: `increase`, `decrease`, `adjust`, `order`, `return`, `manual` |
| `quantity` | Number | ✅ | Amount moved |
| `note.tr` | String | ❌ | Turkish note |
| `note.en` | String | ❌ | English note |
| `note.de` | String | ❌ | German note |
| `createdBy` | ObjectId (ref: User) | ❌ | User who created the movement |
| `createdAt` | Date | Auto | Creation timestamp |

---

## 🛣 API Endpoints

### 🔐 All endpoints require:
- `Authentication (Token)`
- `Admin authorization`

---

### ➕ Create Stock Movement

**POST** `/api/stockmovement/`

**Body Parameters:**
```json
{
  "product": "Product ObjectId",
  "type": "increase | decrease | adjust | order | return | manual",
  "quantity": Number,
  "note": {
    "tr": "Stok notu (TR)",
    "en": "Stock note (EN)",
    "de": "Lagerhinweis (DE)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock movement recorded successfully.",
  "data": { ...movementObject }
}
```

---

### 📄 Get All Stock Movements

**GET** `/api/stockmovement/`

**Optional Query Parameter:**
- `product` — Filter by Product ID

**Response:**
```json
{
  "success": true,
  "message": "Stock movements fetched successfully.",
  "data": [ ...listOfMovements ]
}
```

---

## 🛡 Middlewares
| Middleware | Purpose |
|:-----------|:--------|
| `authenticate` | Checks if user is logged in |
| `authorizeRoles("admin")` | Allows only admin users |

---

## 📌 Notes
- When filtering by `product` in queries, product ID must be a **valid MongoDB ObjectId**.
- Multi-language support for stock movement notes is optional.
- The `createdBy` field links movements to the user who performed the action.

---

## ✅ Status
| Feature | Completed |
|:--------|:----------|
| Model definition | ✅ |
| Controller logic | ✅ |
| Routes with middleware | ✅ |
| Error handling and validation | ✅ |
| Multi-language note support | ✅ |

---

Bu şekilde hem proje standartlarımıza uyduk hem de uluslararası çalışacak bir ekip için **açık, net ve teknik** bir dökümantasyon oluşturduk! 🚀

---

## 👉 Şimdi ne yapmak istersin?
- **Stock modülü** mü geçelim?  
- **Product detaylarını mı** düzenleyelim?  
- Ya da **isteğe göre** yeni bir modüle mi geçelim?

Birini seç, hazır bekliyorum! 🎯