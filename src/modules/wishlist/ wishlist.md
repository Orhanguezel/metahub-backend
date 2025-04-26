# Wishlist Modülü 🌈

## 1. Dosya Yapısı
```
src/modules/wishlist/
  ├── wishlist.controller.ts
  ├── wishlist.models.ts
  ├── wishlist.routes.ts
  ├── index.ts
```

---

## 2. Wishlist Controller Fonksiyonları

### ✅ Kullanıcının Favori Listesini Getir
```typescript
GET /api/wishlist/
```
- Kullanıcının favori ürünlerini getirir.
- `authenticate` middleware kullanılır.

### ➕ Favorilere Ürün Ekle
```typescript
POST /api/wishlist/add/:productId
```
- Belirtilen ürünü favorilere ekler.
- Önceden ekliyse hata verir.

### ❌ Favorilerden Ürün Çıkar
```typescript
DELETE /api/wishlist/remove/:productId
```
- Belirtilen ürünü favorilerden çıkarır.

### ❄️ Favori Listesini Temizle
```typescript
DELETE /api/wishlist/clear
```
- Tüm favorileri temizler.


---

## 3. Wishlist Modeli

### 📊 Wishlist Şema
```typescript
interface IWishlist {
  user: Types.ObjectId;
  products: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
```
- Her kullanıcının bir wishlist'i vardır.
- `products` dizisinde `Product` referansları tutulur.
- `timestamps: true` aktif.


---

## 4. Wishlist Routes

```typescript
import { authenticate } from "@/core/middleware/authMiddleware";

router.use(authenticate);

router.get("/", getWishlist);
router.post("/add/:productId", addToWishlist);
router.delete("/remove/:productId", removeFromWishlist);
router.delete("/clear", clearWishlist);
```
- Tüm işlemler **kullanıcı girişi zorunlu**.


---

## 5. Wishlist Index.ts

```typescript
import express from "express";
import routes from "./wishlist.routes";
import { Wishlist } from "./wishlist.models";

const router = express.Router();
router.use("/", routes);

export * from "./wishlist.controller";
export * from "./wishlist.models";
export { Wishlist };
export default router;
```
- Bütün export yapıları duzenli ve standartlara uygun.


---

## 6. Teknik Notlar

- `express-async-handler` ile try/catch otomatize edildi.
- `isValidObjectId` validasyonları yapıldı.
- `return` komutu hep alt satırda kullanıldı.
- `locale` desteği eklenmeye uygun altyapı mevcut.
- HTTP status kodları doğru kullanıldı (200, 201, 400, 404 vs).


---

# 🔥 Wishlist Modülü Hazır! 🔥

> Sonraki adım için hazırım! Bir sonraki modüle geçelim mi? 🚀

- "review modülüne geçelim"
- "settings modülüne geçelim"
- veya başka bir tercih 👇

