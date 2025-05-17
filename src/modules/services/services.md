
---

# 📖 Service Modülü – Detaylı Dokümantasyon

---

### 📦 Genel Amaç

Service modülü, sistemde **hizmetler (services)** yönetimini sağlar.

Admin paneli ve frontend uygulaması için:
✅ Hizmet ekleme (resimli)
✅ Hizmet listeleme (kategoriye göre filtreleme dahil)
✅ Hizmet detayını getirme
✅ Hizmet güncelleme (resim ekleme/çıkarma, slug güncelleme)
✅ Hizmet soft-delete (arşivleme)
✅ Hizmet hard-delete (tamamen silme)

---

### 💾 Service Modeli

```ts
import mongoose, { Schema, model, models, Document, Model } from "mongoose";

export interface IService extends Document {
  title: { tr: string; en: string; de: string };
  slug: string;
  shortDescription: { tr: string; en: string; de: string };
  detailedDescription: { tr: string; en: string; de: string };
  price?: number;
  durationMinutes?: number;
  images: { url: string; thumbnail: string; webp?: string; publicId?: string }[];
  category: { tr: string; en: string; de: string; slug: string };
  tags?: string[];
  isActive: boolean;
  isPublished: boolean;
}

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const serviceSchema = new Schema<IService>(
  {
    title: { tr: String, en: String, de: String },
    slug: { type: String, unique: true },
    shortDescription: { tr: String, en: String, de: String },
    detailedDescription: { tr: String, en: String, de: String },
    price: Number,
    durationMinutes: { type: Number, default: 60 },
    images: [imageSchema],
    category: {
      tr: String,
      en: String,
      de: String,
      slug: String,
    },
    tags: [String],
    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.pre("validate", function (next) {
  if (!this.slug && this.title?.en) {
    this.slug = this.title.en.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
  }
  next();
});

const Service: Model<IService> = models.Service || model<IService>("Service", serviceSchema);
export default Service;
```

---

### ⚙️ Router: services.routes.ts

```ts
import express from "express";
import {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
  softDeleteService,
} from "./services.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import upload from "@/core/middleware/uploadMiddleware";
import { uploadTypeWrapper } from "@/core/middleware/uploadTypeWrapper";
import { checkFileSizeMiddleware } from "@/core/middleware/checkFileSizeMiddleware";
import transformNestedFields from "@/core/middleware/transformNestedFields";
import { validateCreateService, validateUpdateService, validateObjectId } from "./services.validation";

const router = express.Router();

router.get("/", getAllServices);
router.get("/:id", validateObjectId("id"), getServiceById);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("service"),
  checkFileSizeMiddleware,
  upload.array("images", 5),
  transformNestedFields(["title", "shortDescription", "detailedDescription", "category", "tags"]),
  validateCreateService,
  createService
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  uploadTypeWrapper("service"),
  checkFileSizeMiddleware,
  upload.array("images", 5),
  transformNestedFields(["title", "shortDescription", "detailedDescription", "category", "tags"]),
  validateObjectId("id"),
  validateUpdateService,
  updateService
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  deleteService
);

router.patch(
  "/:id/archive",
  authenticate,
  authorizeRoles("admin"),
  validateObjectId("id"),
  softDeleteService
);

export default router;
```

---

### 🔥 Controller: services.controller.ts

✅ **Create Service**

* Resim yükler
* JSON parse eder (`title`, `description` vs.)
* Thumbnail ve webp üretir
* Slug oluşturur
* DB’ye kaydeder

✅ **Get All Services**

* Tüm aktif/published servisleri döner
* categorySlug parametresiyle filtreler

✅ **Get Service by ID**

* ID kontrolü
* Tekil servis döner

✅ **Update Service**

* ID kontrolü
* Mevcut servisi günceller
* Yeni resim ekler, kaldırılanları siler
* Slug günceller

✅ **Soft Delete**

* isActive → false yapar

✅ **Hard Delete**

* DB’den siler
* Resim ve Cloudinary’den kaldırır

---

### 🌍 Örnek API Endpoints

| Endpoint                      | Yöntem | Açıklama                       |
| ----------------------------- | ------ | ------------------------------ |
| `GET /services`               | Public | Tüm servisleri listeler        |
| `GET /services/:id`           | Public | Servis detayı döner            |
| `POST /services`              | Admin  | Yeni servis oluşturur          |
| `PUT /services/:id`           | Admin  | Servisi günceller              |
| `DELETE /services/:id`        | Admin  | Servisi tamamen siler          |
| `PATCH /services/:id/archive` | Admin  | Servisi arşivler (soft delete) |

---

### 🛡️ Validasyonlar

* **title.tr/en/de** → zorunlu
* **shortDescription.tr/en/de** → zorunlu
* **detailedDescription.tr/en/de** → zorunlu
* **category.slug** → zorunlu
* **price, durationMinutes** → opsiyonel, type check
* **tags** → opsiyonel, array check

---

### 💥 Önemli Middleware'ler

* **uploadMiddleware** → multer + cloudinary
* **uploadTypeWrapper** → yükleme klasörü seçimi
* **checkFileSizeMiddleware** → max boyut limiti
* **transformNestedFields** → string gelen jsonları parse eder
* **validateRequest** → express-validator sonuçlarını okur

---

### 🎯 Örnek Postman Body (form-data)

| Key                 | Value (text)                                                                           |
| ------------------- | -------------------------------------------------------------------------------------- |
| title               | {"tr":"Masaj","en":"Massage","de":"Massage"}                                           |
| shortDescription    | {"tr":"Kısa açıklama","en":"Short description","de":"Kurze Beschreibung"}              |
| detailedDescription | {"tr":"Detaylı açıklama","en":"Detailed description","de":"Detaillierte Beschreibung"} |
| price               | 100                                                                                    |
| durationMinutes     | 60                                                                                     |
| category            | {"tr":"Masaj","en":"Massage","de":"Massage","slug":"massage"}                          |
| tags                | \["relax","therapy"]                                                                   |
| images              | (file) resim1.jpg                                                                      |
| images              | (file) resim2.jpg                                                                      |

---

### ✅ Özet

✅ Çok dilli hizmet yönetimi
✅ Çoklu resim ve thumbnail desteği
✅ Cloudinary + local upload uyumu
✅ Slug, kategori ve tag desteği
✅ Soft delete + hard delete desteği
✅ React/Next.js frontend için hazır API

---

