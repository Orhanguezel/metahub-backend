// src/modules/brand/model.ts
import { Schema, Model, models, model, HydratedDocument } from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";

/* ---------------- Types ---------------- */
export type TranslatedLabel = Partial<Record<SupportedLocale, string>>;
export type BrandStatus = "active" | "inactive";

export interface IBrandImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
  /** Görsel amacı: logo | banner | other */
  kind?: "logo" | "banner" | "other";
}

export interface IBrand {
  // Çok-tenant
  tenant: string;

  // Çok dilli alanlar
  name: TranslatedLabel;          // required (en az 1 dil)
  slug: TranslatedLabel;          // required (i18n)
  slugLower: TranslatedLabel;     // derived (i18n, indeks için)
  description: TranslatedLabel;   // optional (i18n)

  // Opsiyoneller (spec + standartlar)
  website?: string;
  order: number;
  status: BrandStatus;

  // Görseller (standart)
  images: IBrandImage[];

  // Spec uyumluluğu (opsiyonel aynalı alanlar)
  logo?: string;
  banner?: string;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------------- Helpers ---------------- */
const LOCALES: ReadonlyArray<SupportedLocale> = SUPPORTED_LOCALES;

const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const l of LOCALES) fields[l] = { type: String, trim: true };
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

/** tr > en > diğerleri */
function pickPrimaryLocale(obj?: Record<string, any> | null): SupportedLocale | null {
  if (!obj) return null;
  const prio: ReadonlyArray<SupportedLocale> = ["tr", "en", ...LOCALES.filter(l => l !== "tr" && l !== "en")];
  for (const l of prio) if (obj[l] && String(obj[l]).trim()) return l;
  return null;
}

/** Eksik locale alanlarını baseLocale’dan doldurur (immutable) */
function fillAllLocales<T extends Record<string, any>>(
  src: Partial<T>,
  baseLocale: SupportedLocale | null
): Partial<T> {
  if (!baseLocale) return src;
  const out: any = { ...(src || {}) };
  for (const l of LOCALES) {
    const v = out[l];
    if (v == null || (typeof v === "string" && !String(v).trim())) {
      out[l] = out[baseLocale];
    }
  }
  return out;
}

/* --------------- Subschemas -------------- */
const BrandImageSchema = new Schema<IBrandImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
    kind: { type: String, enum: ["logo", "banner", "other"], default: "other", index: true },
  },
  { _id: false }
);

/* ----------------- Schema ---------------- */
const BrandSchema = new Schema<IBrand>(
  {
    tenant: { type: String, required: true, index: true, trim: true },

    // i18n zorunlular
    name: { type: Schema.Types.Mixed, required: true, default: localizedStringField() },
    slug: { type: Schema.Types.Mixed, required: true, default: localizedStringField() },
    slugLower: { type: Schema.Types.Mixed, required: true, default: localizedStringField() },

    // i18n opsiyoneller
    description: { type: Schema.Types.Mixed, default: localizedStringField() },

    // opsiyoneller
    website: { type: String, trim: true },
    order: { type: Number, default: 0, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },

    // görseller
    images: { type: [BrandImageSchema], default: [] },

    // spec aynası (opsiyonel; images.kind ile hizalı)
    logo: { type: String, trim: true },
    banner: { type: String, trim: true },
  },
  { timestamps: true, minimize: false }
);

/* ---------------- Indexler --------------- */
// tenant + slugLower.<locale> benzersiz
for (const l of LOCALES) {
  const p = `slugLower.${l}`;
  BrandSchema.index(
    { tenant: 1, [p]: 1 },
    {
      unique: true,
      partialFilterExpression: { [p]: { $exists: true, $type: "string" } },
      name: `uniq_brand_tenant_slug_${l}`,
    }
  );
}

// listeleme / filtre
BrandSchema.index({ tenant: 1, status: 1, order: 1 }, { name: "by_tenant_status_order" });

// çok dilli text arama
(() => {
  const textIdx: Record<string, "text"> = {};
  for (const l of LOCALES) {
    textIdx[`name.${l}`] = "text";
    textIdx[`description.${l}`] = "text";
  }
  BrandSchema.index(textIdx, { name: "brand_text_search", default_language: "none" });
})();

/* ----------------- Hooks ----------------- */
// i18n normalize + slugLower üret
BrandSchema.pre("validate", function (this: HydratedDocument<IBrand>, next) {
  const anyThis = this as any;

  if (!Array.isArray(anyThis.images)) anyThis.images = [];

  // i18n doldurma
  const base = pickPrimaryLocale(anyThis.name) || "en";
  anyThis.name = fillAllLocales<any>(anyThis.name || {}, base);
  anyThis.slug = fillAllLocales<any>(anyThis.slug || {}, base);
  anyThis.description = fillAllLocales<any>(anyThis.description || {}, base);

  // slug boş olan locale’ler için name’den üret
  for (const l of LOCALES) {
    const s = (anyThis.slug && anyThis.slug[l]) ? String(anyThis.slug[l]) : "";
    const n = (anyThis.name && anyThis.name[l]) ? String(anyThis.name[l]) : "";
    const chosen = s.trim() || n.trim() || "brand";
    anyThis.slug[l] = slugifyUnicode(chosen);
  }

  // slugLower
  anyThis.slugLower = anyThis.slugLower || {};
  for (const l of LOCALES) {
    const s = String(anyThis.slug?.[l] || "");
    anyThis.slugLower[l] = slugifyUnicode(s);
  }

  next();
});

// images.kind ile logo/banner aynalarını güncelle (opsiyonel kalite-of-life)
BrandSchema.pre("save", function (this: HydratedDocument<IBrand>, next) {
  const imgs = (this as any).images as IBrandImage[] | undefined;
  if (imgs && (!this.logo || !this.banner)) {
    const logoImg = imgs.find(i => i.kind === "logo");
    const bannerImg = imgs.find(i => i.kind === "banner");
    if (!this.logo && logoImg) this.logo = logoImg.url;
    if (!this.banner && bannerImg) this.banner = bannerImg.url;
  }
  next();
});

/* ----------------- Model ----------------- */
export const Brand: Model<IBrand> =
  (models.brand as Model<IBrand>) || model<IBrand>("brand", BrandSchema);

export default Brand;
