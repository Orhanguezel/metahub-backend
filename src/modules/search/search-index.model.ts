import { Schema, model, models, type Model, Types } from "mongoose";
import type { ISearchIndex } from "./types";

const RefSchema = new Schema(
  {
    collection: { type: String, required: true, trim: true, lowercase: true },
    id: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { _id: false }
);

const BrandMiniSchema = new Schema(
  { id: { type: Schema.Types.ObjectId }, name: String },
  { _id: false }
);

const CategoryMiniSchema = new Schema(
  { id: { type: Schema.Types.ObjectId }, path: { type: [String], default: [] }, name: String },
  { _id: false }
);

const SearchIndexSchema = new Schema<ISearchIndex>(
  {
    tenant: { type: String, required: true, index: true },

    ref: { type: RefSchema, required: true },
    type: { type: String, enum: ["product", "brand", "category", "content"], required: true, index: true },

    slug: { type: String, trim: true, lowercase: true },
    title: { type: Map, of: String, default: {} },
    subtitle: { type: Map, of: String, default: {} },
    keywords: { type: [String], default: [] },
    image: String,

    price_cents: { type: Number, min: 0 },
    offer_price_cents: { type: Number, min: 0 },
    currency: String,
    brand: { type: BrandMiniSchema, default: undefined },
    category: { type: CategoryMiniSchema, default: undefined },

    searchable: { type: String, required: true, index: "text" },
    boost: { type: Number, default: 1, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

/** Aynı kaynağın tekil projeksiyonu */
SearchIndexSchema.index(
  { tenant: 1, "ref.collection": 1, "ref.id": 1 },
  { unique: true, sparse: false }
);

SearchIndexSchema.index(
  { tenant: 1, type: 1, isActive: 1, boost: -1, updatedAt: -1 }
);

/** Map alanlarını JSON'a düz nesne olarak aktar */
SearchIndexSchema.set("toJSON", {
  transform: (_doc, ret) => {
    if (ret?.title instanceof Map) ret.title = Object.fromEntries(ret.title);
    if (ret?.subtitle instanceof Map) ret.subtitle = Object.fromEntries(ret.subtitle);
    return ret;
  },
});

export const SearchIndex: Model<ISearchIndex> =
  models.searchindex || model<ISearchIndex>("searchindex", SearchIndexSchema);

export default SearchIndex;
