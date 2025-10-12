import { Schema, model, models, type Model } from "mongoose";
import type { IWishlist, IWishlistItem } from "./types";

const ItemSchema = new Schema<IWishlistItem>({
  product: { type: Schema.Types.ObjectId, ref: "product", required: true, index: true },
  variant: { type: Schema.Types.ObjectId, ref: "productvariant", default: null, index: true },
  addedAt: { type: Date, default: () => new Date() },
  note: String,
});

const WishlistSchema = new Schema<IWishlist>({
  tenant:  { type: String, required: true, index: true },
  user:    { type: Schema.Types.ObjectId, ref: "user",   default: undefined, index: true },
  session: { type: String,                 default: undefined, index: true },
  isPublic:{ type: Boolean, default: false, index: true },
  items:   { type: [ItemSchema], default: [] },
});

/**
 * Uniqueness kuralları (partial index):
 * - (tenant, user)  → yalnızca user VARSA unique
 * - (tenant, session) → yalnızca session VARSA unique
 * Böylece guest belgeleri user=null ile çakışmaz.
 */
WishlistSchema.index(
  { tenant: 1, user: 1 },
  {
    unique: true,
    name: "uniq_tenant_user_when_user_exists",
    partialFilterExpression: { user: { $exists: true, $type: "objectId" } },
  }
);

WishlistSchema.index(
  { tenant: 1, session: 1 },
  {
    unique: true,
    name: "uniq_tenant_session_when_session_exists",
    partialFilterExpression: { session: { $exists: true, $type: "string" } },
  }
);

/* Dedupe guard (aynı product+variant tekrarını engelle) */
WishlistSchema.pre("save", function (next) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of (this as any).items || []) {
    const key = `${String(it.product)}:${it.variant ? String(it.variant) : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  (this as any).items = out;
  next();
});

export const Wishlist: Model<IWishlist> =
  models.wishlist || model<IWishlist>("wishlist", WishlistSchema);

export default Wishlist;
