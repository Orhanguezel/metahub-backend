// src/modules/favorite/favorite.model.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IFavorite extends Document {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: true }
);

export default model<IFavorite>("Favorite", favoriteSchema);
