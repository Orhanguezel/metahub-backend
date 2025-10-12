// src/modules/reviews/models.ts
import { Schema, model, models, type Model } from "mongoose";
import type { IReview } from "./types";

const ReviewSchema = new Schema<IReview>(
  {
    tenant:  { type: String, required: true, index: true, trim: true },
    product: { type: Schema.Types.ObjectId, ref: "product", required: true, index: true },
    user:    { type: Schema.Types.ObjectId, ref: "user" }, // opsiyonel (guest)

    rating:  { type: Number, min: 1, max: 5, required: true, index: true },
    title:   { type: String, trim: true, maxlength: 300 },
    content: { type: String, maxlength: 5000 },
    images:  { type: [String], default: [] },

    status:  { type: String, enum: ["pending","approved","rejected"], default: "pending", index: true },

    likes:    { type: Number, default: 0, min: 0 },
    dislikes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

/**
 * Tekillik: SADECE user bir ObjectId olduğunda uygulanır.
 *  - Üye: aynı ürün için bir kez yorum (eşsiz)
 *  - Misafir (user yok): sınırsız (index tetiklenmez)
 */
ReviewSchema.index(
  { tenant: 1, product: 1, user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);

/* Sık kullanılan sorgular */
ReviewSchema.index({ tenant: 1, product: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ tenant: 1, rating: -1, createdAt: -1 });

/* Basit trim */
ReviewSchema.pre("save", function (next) {
  if (this.title) this.title = this.title.trim();
  if (this.content) this.content = this.content.trim();
  next();
});

export const Review: Model<IReview> = models.review || model<IReview>("review", ReviewSchema);
export default Review;
