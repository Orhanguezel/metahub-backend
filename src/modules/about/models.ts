import { Schema, Model, models, model } from "mongoose";
import { SUPPORTED_LOCALES } from "@/types/common";
import type { IAbout, IAboutImage } from "./types";

/* ---- Helpers ---- */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) fields[locale] = { type: String, trim: true };
  return fields;
};

/** Unicode güvenli, dil-agnostik slug üretimi */
function slugifyUnicode(input: string): string {
  if (!input) return "";
  // normalize + trim
  let s = input.normalize("NFKC").trim();

  // boşlukları tire
  s = s.replace(/\s+/g, "-");

  // harf/rakam/işaret (Mark) ve tire dışındakileri kaldır (Unicode aware)
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, "");

  // birden çok tire -> tek tire
  s = s.replace(/-+/g, "-");

  // baş/son tire temizle
  s = s.replace(/^-+|-+$/g, "");

  // lowercase (CJK/Arabic etkilenmez; Latin’de normalize eder)
  return s.toLowerCase();
}

/* ---- Schemas ---- */
const AboutImageSchema = new Schema<IAboutImage>(
  {
    url:       { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp:      { type: String, trim: true },
    publicId:  { type: String, trim: true },
  },
  { _id: true }
);

const AboutSchema = new Schema<IAbout>(
  {
    title:   localizedStringField(),
    tenant:  { type: String, required: true, index: true, trim: true },

    // ✅ ÇOK-DİLLİ slug alanları
    slug:      localizedStringField(),          // kullanıcıya görünen
    slugLower: localizedStringField(),          // indeksleme/lookup (auto)

    summary: localizedStringField(),
    content: localizedStringField(),

    images: { type: [AboutImageSchema], default: [] },
    tags: {
      type: [String],
      default: [],
      set: (arr: string[]) =>
        [...new Set((arr || []).map((s) => s.trim()).filter(Boolean))],
    },

    author:   { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "aboutcategory", required: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    comments:    { type: [Schema.Types.ObjectId], ref: "comment", default: [] },
    isActive:    { type: Boolean, default: true, index: true },
    order:       { type: Number,  default: 0, index: true },
  },
  { timestamps: true, minimize: false }
);

/* ---- Indexes ---- */
// 🔁 Artık tek dilli `tenant+slug` unique yok.
// Her dil için tenant scoped partial-unique index kuruyoruz.
for (const locale of SUPPORTED_LOCALES) {
  const path = `slugLower.${locale}`;
  AboutSchema.index(
    { tenant: 1, [path]: 1 },
    {
      unique: true,
      partialFilterExpression: { [path]: { $exists: true, $type: "string" } },
      name: `uniq_tenant_slug_${locale}`,
    }
  );
}

AboutSchema.index({ tenant: 1, createdAt: -1 });

/* ---- Hooks ---- */
AboutSchema.pre("validate", function (next) {
  // Koleksiyon alanlarını normalize et
  if (!Array.isArray(this.images)) this.images = [];
  if (!Array.isArray(this.tags)) this.tags = [];
  if (!Array.isArray(this.comments)) this.comments = [];

  // slug & slugLower üretimi (varsa dokunma, yoksa title'dan üret)
  const slugObj: Record<string, string> = (this.slug as any) || {};
  const lowerObj: Record<string, string> = (this.slugLower as any) || {};

  for (const locale of SUPPORTED_LOCALES) {
    const current = (slugObj as any)[locale];
    if (current && typeof current === "string" && current.trim()) {
      const clean = slugifyUnicode(current);
      if (clean) {
        (slugObj as any)[locale] = clean;
        (lowerObj as any)[locale] = clean.toLowerCase();
        continue;
      }
    }

    // yoksa title'dan üret
    const titleForLocale =
      (this as any).title?.[locale] ??
      (this as any).title?.["en"] ??
      Object.values((this as any).title || {})[0] ??
      "";

    const candidate = slugifyUnicode(String(titleForLocale));
    if (candidate) {
      (slugObj as any)[locale] = candidate;
      (lowerObj as any)[locale] = candidate.toLowerCase();
    }
  }

  // Objeleri geri yaz
  (this as any).slug = slugObj;
  (this as any).slugLower = lowerObj;

  next();
});

// publish değişimini yönet
AboutSchema.pre("save", function (next) {
  if (this.isModified("isPublished")) {
    if (this.isPublished && !this.publishedAt) this.publishedAt = new Date();
    if (!this.isPublished) this.publishedAt = undefined;
  }
  next();
});

export const About: Model<IAbout> =
  (models.about as Model<IAbout>) || model<IAbout>("about", AboutSchema);
