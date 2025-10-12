import { Schema, model, models, type Model } from "mongoose";
import type { ICompare, ICompareItem } from "./types";

const ItemSchema = new Schema<ICompareItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "product", required: true, index: true },
    variant: { type: Schema.Types.ObjectId, ref: "productvariant", default: null, index: true },
    addedAt: { type: Date, default: () => new Date() },
    note: String,
  },
  { _id: true }
);

const CompareSchema = new Schema<ICompare>(
  {
    tenant: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "user", default: null, index: true },
    session: { type: String, default: null, index: true },
    isPublic: { type: Boolean, default: false, index: true },
    items: { type: [ItemSchema], default: [] },
  },
  { timestamps: true }
);

/* Benzersiz sahiplik: tenant+user (sparse), tenant+session (sparse) */
CompareSchema.index({ tenant: 1, user: 1 }, { unique: true, sparse: true });
CompareSchema.index({ tenant: 1, session: 1 }, { unique: true, sparse: true });

/* Dedupe + sınır (max 50 öğe) */
const MAX_ITEMS = 50;
CompareSchema.pre("save", function (next) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of (this as any).items || []) {
    const key = `${String(it.product)}:${it.variant ? String(it.variant) : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  // oldest prune
  if (out.length > MAX_ITEMS) {
    out.splice(0, out.length - MAX_ITEMS);
  }
  (this as any).items = out;
  next();
});

export const Compare: Model<ICompare> =
  models.compare || model<ICompare>("compare", CompareSchema);

export default Compare;
