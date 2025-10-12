// src/modules/category/model.ts
import { Schema, Model, models, model, HydratedDocument } from "mongoose";
import type { ICategory, ICategoryImage, ICategoryAncestor } from "./types";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

/* ---------------- Helpers ---------------- */
const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of LOCALES) fields[locale] = { type: String, trim: true };
  return fields;
};

/** Unicode güvenli slug */
function slugifyUnicode(input: string): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC").trim();
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.toLowerCase();
}

/** En dolu/öncelikli locale (tr > en > diğerleri) */
function pickPrimaryLocale(obj?: Record<string, any> | null): SupportedLocale | null {
  if (!obj) return null;
  const priority: ReadonlyArray<SupportedLocale> = ["tr", "en", ...LOCALES.filter(l => l !== "tr" && l !== "en")];
  for (const loc of priority) if (obj[loc] && String(obj[loc]).trim()) return loc;
  return null;
}

/** Eksik locale alanlarını baseLocale’dan doldurur (immutable) */
function fillAllLocales<T extends Record<string, any>>(
  src: Partial<T>,
  baseLocale: SupportedLocale | null
): Partial<T> {
  if (!baseLocale) return src;
  const out: any = { ...(src || {}) };
  for (const loc of LOCALES) {
    const v = out[loc];
    if (v == null || (typeof v === "string" && !String(v).trim())) {
      out[loc] = out[baseLocale];
    }
  }
  return out;
}

/* --------------- Subschemas -------------- */
const CategoryImageSchema = new Schema<ICategoryImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const AncestorSchema = new Schema<ICategoryAncestor>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    name: { type: Schema.Types.Mixed, required: true }, // i18n
  },
  { _id: false, minimize: false }
);

/* ----------------- Schema ---------------- */
const CategorySchema = new Schema<ICategory>(
  {
    // Çok-tenant
    tenant: { type: String, required: true, index: true, trim: true },

    // Zorunlu (i18n)
    name: { type: Schema.Types.Mixed, required: true, default: localizedStringField() },
    slug: { type: Schema.Types.Mixed, required: true, default: localizedStringField() },
    slugLower: { type: Schema.Types.Mixed, required: true, default: localizedStringField() },

    // Opsiyoneller (spec)
    parentId: { type: Schema.Types.ObjectId, ref: "category", default: null, alias: "parent" },
    image: { type: String, trim: true },
    icon: { type: String, trim: true },
    banner: { type: String, trim: true },
    order: { type: Number, default: 0, index: true },
    status: { type: String, enum: ["active", "draft", "hidden"], default: "active", index: true },
    description: { type: Schema.Types.Mixed, default: localizedStringField() },
    seoTitle: { type: Schema.Types.Mixed, default: localizedStringField() },
    seoDescription: { type: Schema.Types.Mixed, default: localizedStringField() },

    // Görseller toplu (değişmedi)
    images: { type: [CategoryImageSchema], default: [] },

    // Hiyerarşi
    ancestors: { type: [AncestorSchema], default: [] },
    depth: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

/* ---------------- Indexler --------------- */
// tenant + slugLower.<locale> = unique
for (const locale of LOCALES) {
  const path = `slugLower.${locale}`;
  CategorySchema.index(
    { tenant: 1, [path]: 1 },
    {
      unique: true,
      partialFilterExpression: { [path]: { $exists: true, $type: "string" } },
      name: `uniq_category_tenant_slug_${locale}`,
    }
  );
}

// Liste & ağaç
CategorySchema.index({ tenant: 1, parentId: 1, order: 1 }, { name: "by_tenant_parent_order" });
CategorySchema.index({ tenant: 1, status: 1, order: 1 }, { name: "by_tenant_status_order" });

// Çok dilli arama
(() => {
  const textIdx: Record<string, "text"> = {};
  for (const lng of LOCALES) {
    textIdx[`name.${lng}`] = "text";
    textIdx[`description.${lng}`] = "text";
    textIdx[`seoTitle.${lng}`] = "text";
    textIdx[`seoDescription.${lng}`] = "text";
  }
  CategorySchema.index(textIdx, { name: "category_text_search", default_language: "none" });
})();

/* ----------------- Hooks ----------------- */
// slugLower üret + eksik locale’leri doldur
CategorySchema.pre("validate", function (this: HydratedDocument<ICategory>, next) {
  const anyThis = this as any;

  // Görsel alanları normalize
  if (!Array.isArray(anyThis.images)) anyThis.images = [];

  // name/slug alanları i18n doldurma
  const baseLocale = pickPrimaryLocale(anyThis.name) || "en";
  anyThis.name = fillAllLocales<any>(anyThis.name || {}, baseLocale);
  anyThis.slug = fillAllLocales<any>(anyThis.slug || {}, baseLocale);

  // slug boş olan locale’ler için name’den türet
  for (const loc of LOCALES) {
    const s = (anyThis.slug && anyThis.slug[loc]) ? String(anyThis.slug[loc]) : "";
    const n = (anyThis.name && anyThis.name[loc]) ? String(anyThis.name[loc]) : "";
    const chosen = s.trim() || n.trim() || "category";
    const clean = slugifyUnicode(chosen);
    anyThis.slug[loc] = clean;
  }

  // slugLower
  anyThis.slugLower = anyThis.slugLower || {};
  for (const loc of LOCALES) {
    const s = String(anyThis.slug?.[loc] || "");
    anyThis.slugLower[loc] = slugifyUnicode(s);
  }

  next();
});

// parent/ancestors/depth oluştur (parent alias'ı desteklenir)
CategorySchema.pre("save", async function (this: HydratedDocument<ICategory>, next) {
  const anyThis = this as any;

  if (!anyThis.isModified("parentId") && !anyThis.isNew) return next();

  const tenant = anyThis.tenant;
  const parentId = anyThis.parentId || null;

  if (!parentId) {
    // root
    anyThis.ancestors = [];
    anyThis.depth = 0;
    return next();
  }

  // ⚠️ Tip düzeltmesi: Model<ICategory>
  const CategoryModel = this.model<ICategory>("category") as unknown as Model<ICategory>;
  const parent = await CategoryModel.findOne({ _id: parentId, tenant });
  if (!parent) {
    anyThis.parentId = null;
    anyThis.ancestors = [];
    anyThis.depth = 0;
    return next();
  }

  // cycle koruması
  if (String(anyThis._id) === String(parentId) || parent.ancestors.some(a => String(a._id) === String(anyThis._id))) {
    return next(new Error("Invalid parent: cyclic hierarchy."));
  }

  // parent için kanonik slug seçimi
  const pPrimary = pickPrimaryLocale(parent.slug as any) || pickPrimaryLocale(parent.name as any) || "en";
  const parentSlug = (parent.slug as any)?.[pPrimary] || Object.values(parent.slug as any || {})[0] || "";
  anyThis.ancestors = [
    ...parent.ancestors,
    { _id: parent._id, slug: String(parentSlug), name: parent.name as any },
  ];
  anyThis.depth = parent.depth + 1;

  next();
});

export const Category: Model<ICategory> =
  (models.category as Model<ICategory>) || model<ICategory>("category", CategorySchema);

export default Category;
