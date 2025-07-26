import { Schema, model, Document, Types, Model, models } from "mongoose";

// ✅ Favorite Interface
interface IFavorite extends Document {
  userId: Types.ObjectId;
  tenant: string; // Optional tenant field for multi-tenancy
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Favorite Schema
const favoriteSchema = new Schema<IFavorite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    tenant: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type
const Favorite: Model<IFavorite> =
  models.favorite || model<IFavorite>("favorite", favoriteSchema);

export { IFavorite, Favorite };
export default Favorite;
