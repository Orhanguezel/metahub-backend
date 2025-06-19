import { Schema, model, Types, Model, models } from "mongoose";

export interface IReview  {
  user: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  product: Types.ObjectId;
  rating: number;
  comment: string;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewModel extends Model<IReview> {
  calculateAverageRating(productId: Types.ObjectId): Promise<{ averageRating: number; totalReviews: number }>;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenant: { type: String, required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    editedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ortalama puan hesaplama
reviewSchema.statics.calculateAverageRating = async function (productId: Types.ObjectId) {
  const result = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return result.length
    ? { averageRating: result[0].averageRating, totalReviews: result[0].totalReviews }
    : { averageRating: 0, totalReviews: 0 };
};

const Review = (models.Review as ReviewModel) || model<IReview, ReviewModel>("Review", reviewSchema);

export { Review };
