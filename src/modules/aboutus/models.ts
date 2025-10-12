import { Schema, Model, models, model } from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { IAboutus, IAboutusImage, TranslatedOptional } from "./types";

/* ---- Helpers ---- */
function slugifyUnicode(input: string): string {
  if (!input) return "";
  let s = String(input).normalize("NFKC").trim();
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^\p{L}\p{N}\p{M}-]+/gu, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s.toLowerCase();
}

const AboutusImageSchema = new Schema<IAboutusImage>(
  {
    url: { type: String, required: true, trim: true },
    thumbnail: { type: String, required: true, trim: true },
    webp: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: true }
);

/**
 * i18n alanları Mixed + {} default
 *  - normalize & doldurma controller + hook’larda yapılır
 */
const AboutusSchema = new Schema<IAboutus>(
  {
    title: { type: Schema.Types.Mixed, required: true, default: {} },      // Record<locale,string>
    tenant: { type: String, required: true, index: true, trim: true },

    slug: { type: Schema.Types.Mixed, default: {} },                       // Record<locale,string>
    slugLower: { type: Schema.Types.Mixed, default: {} },                  // Record<locale,string> (lowercased)

    summary: { type: Schema.Types.Mixed, required: true, default: {} },    // Record<locale,string>
    content: { type: Schema.Types.Mixed, required: true, default: {} },    // Record<locale,string>

    images: { type: [AboutusImageSchema], default: [] },

    tags: { type: Schema.Types.Mixed, default: {} },                       // Record<locale,string[]>

    author: { type: String, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "aboutcategory", required: true },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    comments: { type: [Schema.Types.ObjectId], ref: "comment", default: [] },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true, minimize: false }
);

/* ---- Indexes ---- */
// tenant + slugLower.<locale> partial unique
for (const locale of SUPPORTED_LOCALES) {
  const path = `slugLower.${locale}`;
  AboutusSchema.index(
    { tenant: 1, [path]: 1 },
    {
      unique: true,
      partialFilterExpression: { [path]: { $exists: true, $type: "string" } },
      name: `uniq_aboutus_tenant_slug_${locale}`,
    }
  );
}
AboutusSchema.index({ tenant: 1, createdAt: -1 });

// Çok dilli text index (title, summary, tags)
(() => {
  const textIdx: Record<string, "text"> = {};
  for (const l of SUPPORTED_LOCALES) {
    textIdx[`title.${l}`] = "text";
    textIdx[`summary.${l}`] = "text";
    textIdx[`tags.${l}`] = "text";
  }
  AboutusSchema.index(textIdx, { name: "aboutus_text_search" });
})();

/* ---- Hooks ---- */
AboutusSchema.pre("validate", function (next) {
  const doc = this as any;

  // Guard
  if (!doc.title || typeof doc.title !== "object") doc.title = {};
  if (!doc.slug || typeof doc.slug !== "object") doc.slug = {};
  if (!doc.slugLower || typeof doc.slugLower !== "object") doc.slugLower = {};
  if (!doc.tags || typeof doc.tags !== "object") doc.tags = {};
  if (!Array.isArray(doc.images)) doc.images = [];
  if (!Array.isArray(doc.comments)) doc.comments = [];

  // slug / slugLower üret + sanitize (title fallbacks)
  const slugObj: TranslatedOptional = { ...(doc.slug || {}) };
  const lowerObj: TranslatedOptional = { ...(doc.slugLower || {}) };

  for (const locale of SUPPORTED_LOCALES) {
    const current = (slugObj as any)[locale];
    let base: string | undefined;

    if (current && typeof current === "string" && current.trim()) {
      base = current;
    } else {
      const titleForLocale =
        doc.title?.[locale] ??
        doc.title?.["en"] ??
        Object.values(doc.title || {})[0] ??
        "";
      if (titleForLocale) base = String(titleForLocale);
    }

    if (base) {
      const clean = slugifyUnicode(base);
      (slugObj as any)[locale] = clean;
      (lowerObj as any)[locale] = clean; // slugifyUnicode zaten lowercase
    }
  }

  doc.slug = slugObj;
  doc.slugLower = lowerObj;

  // publish alanı
  if (doc.isModified?.("isPublished")) {
    if (doc.isPublished && !doc.publishedAt) doc.publishedAt = new Date();
    if (!doc.isPublished) doc.publishedAt = undefined;
  }

  next();
});

export const Aboutus: Model<IAboutus> =
  (models.aboutus as Model<IAboutus>) || model<IAboutus>("aboutus", AboutusSchema);

export default Aboutus;
