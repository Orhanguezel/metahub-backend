// src/modules/product/models.ts
import { Schema, Model, models, model } from "mongoose";
import mongoose from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type {
  IProduct,
  IProductImage,
  IProductDimensions,
  IProductOption,
} from "./types";

/* ------------ Helpers ------------- */
const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of LOCALES) fields[locale] = { type: String, trim: true };
  return fields;
};
const localizedStringArrayField = () => {
  const fields: Record<string, any> = {};
  for (const locale of LOCALES) fields[locale] = [{ type: String, trim: true }];
  return fields;
};

function slugifyUnicode(input: string): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC").trim();
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s.toLowerCase();
}
function pickPrimaryLocale(obj?: Record<string, any> | null): SupportedLocale | null {
  if (!obj) return null;
  const priority: ReadonlyArray<SupportedLocale> = ["tr", "en", ...LOCALES.filter(l => l !== "tr" && l !== "en")];
  for (const loc of priority) if (obj[loc] && String(obj[loc]).trim()) return loc;
  return null;
}
function fillAllLocales<T extends Record<string, any>>(src: Partial<T>, baseLocale: SupportedLocale | null): Partial<T> {
  if (!baseLocale) return src;
  const out: any = { ...(src || {}) };
  for (const loc of LOCALES) {
    if (out[loc] == null || (typeof out[loc] === "string" && !String(out[loc]).trim())) {
      out[loc] = out[baseLocale];
    }
  }
  return out;
}

/* ------------ Subschemas ------------- */
const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const DimensionsSchema = new Schema<IProductDimensions>(
  {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { type: String, trim: true },
  },
  { _id: false }
);

const OptionSchema = new Schema<IProductOption>(
  {
    name: { type: Schema.Types.Mixed, default: localizedStringField() },
    values: { type: Schema.Types.Mixed, default: localizedStringArrayField() },
    key: { type: String, trim: true },
  },
  { _id: false, minimize: false }
);


const ProductSchema = new Schema<IProduct>({
  tenant: { type: String, required: true, index: true, trim: true },

  title: { type: Schema.Types.Mixed, required: true },          // default kaldırıldı
  slug: { type: Schema.Types.Mixed },                           // default kaldırıldı
  slugLower: { type: Schema.Types.Mixed, default: {} },
  slugCanonical: { type: String, required: true, trim: true, lowercase: true },

  price: { type: Number, required: true, min: 0 },
  images: { type: [ProductImageSchema], required: true, default: [] },
  categoryId: { type: Schema.Types.ObjectId, ref: "category", required: true },

  sellerId: { type: Schema.Types.ObjectId, ref: "seller", default: null, index: true },

  sku: { type: String, trim: true },
  shortDescription: { type: Schema.Types.Mixed, default: {} },
  description: { type: Schema.Types.Mixed, default: {} },
  brandId: { type: Schema.Types.ObjectId, ref: "brand" },

  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  badges: [{ type: String, trim: true }],

  salePrice: { type: Number, min: 0 },
  discountPercent: { type: Number, min: 0, max: 100 },

  status: { type: String, enum: ["active","draft","archived","hidden"], default: "active", index: true },

  tags: { type: Schema.Types.Mixed, default: {} },

  videoUrl: { type: String, trim: true },
  gallery: { type: [ProductImageSchema], default: [] },

  attributes: [{ type: Schema.Types.ObjectId, ref: "productattribute", default: undefined }],
  variants: [{ type: Schema.Types.ObjectId, ref: "productvariant", default: undefined }],

  // Option item’larının Mixed default’larını da {} yap
  options: {
    type: [{
      name: { type: Schema.Types.Mixed, default: {} },
      values: { type: Schema.Types.Mixed, default: {} },
      key: { type: String, trim: true },
    }],
    default: []
  },

  shippingClass: { type: String, trim: true },
  taxClass: { type: String, trim: true },
  barcode: { type: String, trim: true },

  weight: { type: Number, min: 0 },
  dimensions: { type: DimensionsSchema, default: undefined },

  minPurchaseQty: { type: Number, min: 1 },
  maxPurchaseQty: { type: Number, min: 1 },

  visibility: { type: String, enum: ["public","private","hidden","draft"], default: "public", index: true },

  seoTitle: { type: Schema.Types.Mixed, default: {} },
  seoDescription: { type: Schema.Types.Mixed, default: {} },
  seoKeywords: { type: Schema.Types.Mixed, default: {} },
}
, {
  timestamps: true,
  minimize: false,
  toJSON: { virtuals: true, transform: (_doc, ret) => { ret.id = ret._id?.toString(); delete ret._id; delete ret.__v; return ret; } },
  toObject: { virtuals: true }
});


/* ------------ Virtuals ------------- */
/** Ürünün satıcısını populate edebilmek için: Product.find(...).populate('seller', 'companyName slug avatarUrl') */
ProductSchema.virtual("seller", {
  ref: "seller",
  localField: "sellerId",
  foreignField: "_id",
  justOne: true,
});

/* ------------ Indexler ------------- */
// tenant + slugCanonical (benzersiz)
ProductSchema.index({ tenant: 1, slugCanonical: 1 }, { unique: true, name: "uniq_tenant_slug_canonical" });

// tenant + slugLower.<locale> (benzersiz, partial)
for (const locale of LOCALES) {
  const path = `slugLower.${locale}`;
  ProductSchema.index(
    { tenant: 1, [path]: 1 },
    {
      unique: true,
      partialFilterExpression: { [path]: { $exists: true, $type: "string" } },
      name: `uniq_product_tenant_slug_${locale}`,
    }
  );
}

// Liste/filtre indexleri
ProductSchema.index({ tenant: 1, status: 1, visibility: 1, createdAt: -1 }, { name: "list_tenant_status_visibility" });
ProductSchema.index({ tenant: 1, categoryId: 1 }, { name: "by_tenant_category" });
ProductSchema.index({ tenant: 1, brandId: 1 }, { name: "by_tenant_brand" });
ProductSchema.index({ tenant: 1, price: 1 }, { name: "by_tenant_price" });
ProductSchema.index({ tenant: 1, stock: 1 }, { name: "by_tenant_stock" });
ProductSchema.index({ tenant: 1, rating: -1 }, { name: "by_tenant_rating" });
ProductSchema.index({ tenant: 1, reviewCount: -1 }, { name: "by_tenant_reviewCount" });

// ⬇️ Satıcıya göre ürün listeleme için index (opsiyonel kullanım)
ProductSchema.index({ tenant: 1, sellerId: 1, status: 1, visibility: 1, createdAt: -1 }, { name: "by_tenant_seller" });

// Çok dilli text index
(() => {
  const textIdx: Record<string, "text"> = {};
  for (const lng of LOCALES) {
    textIdx[`title.${lng}`] = "text";
    textIdx[`shortDescription.${lng}`] = "text";
    textIdx[`description.${lng}`] = "text";
    textIdx[`seoTitle.${lng}`] = "text";
    textIdx[`seoDescription.${lng}`] = "text";
    textIdx[`tags.${lng}`] = "text";
    textIdx[`seoKeywords.${lng}`] = "text";
  }
  ProductSchema.index(textIdx, { name: "product_text_search", default_language: "none" });
})();

/* ------------ Hooks ------------- */
ProductSchema.pre("validate", function (next) {
  const doc = this as any;

  // dizi normalizasyonları
  if (!Array.isArray(doc.images)) doc.images = [];
  if (!Array.isArray(doc.gallery)) doc.gallery = [];
  if (!Array.isArray(doc.badges)) doc.badges = [];
  if (!Array.isArray(doc.attributes)) doc.attributes = [];
  if (!Array.isArray(doc.variants)) doc.variants = [];
  if (!Array.isArray(doc.options)) doc.options = [];

  // tags/seoKeywords temizleme + locale doldurma
  const baseTagsLocale =
    (Object.keys(doc.tags || {}) as SupportedLocale[]).find((k) => Array.isArray(doc.tags?.[k]) && doc.tags[k].length) ||
    pickPrimaryLocale(doc.title);

  const cleanLocaleArrayMap = (src?: Record<string, string[]>) => {
    const out: Record<string, string[]> = { ...(src || {}) };
    for (const loc of LOCALES) {
      const arr = Array.isArray(out[loc]) ? out[loc] : [];
      out[loc] = [...new Set(arr.map((s: any) => String(s).trim()).filter(Boolean))];
    }
    return out;
  };
  doc.tags = fillAllLocales(cleanLocaleArrayMap(doc.tags), baseTagsLocale);
  doc.seoKeywords = fillAllLocales(cleanLocaleArrayMap(doc.seoKeywords), baseTagsLocale || "en");

  // slug & slugLower üretimi
  const slugObj: Record<string, string> = { ...(doc.slug || {}) };
  const lowerObj: Record<string, string> = { ...(doc.slugLower || {}) };
  for (const loc of LOCALES) {
    const current = (slugObj as any)[loc];
    const baseTitle =
      doc.title?.[loc] ?? doc.title?.["en"] ?? (Object.values(doc.title || {})[0] as string) ?? "product";
    const chosen = (current && String(current).trim()) ? String(current) : String(baseTitle);
    const clean = slugifyUnicode(chosen);
    (slugObj as any)[loc] = clean;
    (lowerObj as any)[loc] = clean.toLowerCase();
  }
  doc.slug = slugObj;
  doc.slugLower = lowerObj;

  // canonical slug
  const baseLocale = pickPrimaryLocale(doc.slug) || pickPrimaryLocale(doc.title) || "en";
  const canonSource =
    (doc.slug && doc.slug[baseLocale]) ||
    (doc.title && doc.title[baseLocale]) ||
    (Object.values(doc.title || {})[0] as string) ||
    "product";
  doc.slugCanonical = slugifyUnicode(String(canonSource));

  // indirim yüzdesi
  if (typeof doc.salePrice === "number" && typeof doc.price === "number" && doc.price > 0) {
    const pct = Math.max(0, Math.min(100, Math.round(100 - (doc.salePrice * 100) / doc.price)));
    doc.discountPercent = pct;
  }

  // sellerId opsiyonel — hiçbir zorunluluk yok. (tenant uyumu doğrulaması controller seviyesinde yapılabilir.)
  next();
});

const Product: Model<IProduct> =
  (models.product as Model<IProduct>) || model<IProduct>("product", ProductSchema);

export { Product };
export default Product;

/* ------------ Legacy index temizlik ------------- */
export async function ensureProductIndexesClean() {
  const conn = mongoose.connection;
  if (conn.readyState !== 1) return;

  const col = conn.collection("products");
  try {
    const indexes = await col.indexes();
    const bad = indexes.find((i: any) => i.name === "slug_1" || (i.key && i.key.slug === 1));
    if (bad) {
      await col.dropIndex(bad.name);
      await col.createIndex({ tenant: 1, slugCanonical: 1 }, { unique: true, name: "uniq_tenant_slug_canonical" });
      for (const locale of LOCALES) {
        const path = `slugLower.${locale}`;
        await col.createIndex(
          { tenant: 1, [path]: 1 },
          { unique: true, partialFilterExpression: { [path]: { $exists: true, $type: "string" } }, name: `uniq_product_tenant_slug_${locale}` }
        );
      }
    }
  } catch (_e) {
    // sessiz geç
  }
}
