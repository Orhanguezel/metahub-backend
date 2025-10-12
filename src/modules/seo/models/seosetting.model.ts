import { Schema, model, models, type Model } from "mongoose";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import type { ISeoSetting } from "../types";

// --- helpers (dış kaynaklardan default)
const defaultLocales = (): SupportedLocale[] =>
  (Array.isArray(SUPPORTED_LOCALES) && SUPPORTED_LOCALES.length
    ? (SUPPORTED_LOCALES as SupportedLocale[])
    : []) as SupportedLocale[];

const defaultPrimary = (): SupportedLocale =>
  ((process.env.DEFAULT_LOCALE as SupportedLocale) ||
    (defaultLocales()[0] as SupportedLocale)) as SupportedLocale;

const SeoSettingSchema = new Schema<ISeoSetting>(
  {
    tenant: { type: String, required: true, index: true, unique: true, trim: true },
    siteUrl: { type: String, trim: true },
    enableIndexing: { type: Boolean, default: true },
    defaultChangefreq: {
      type: String,
      enum: ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"],
      default: "weekly",
    },
    defaultPriority: { type: Number, min: 0.1, max: 1.0, default: 0.7 },

    // Dil defaultları KOD İÇİNDE SABİT DEĞİL → dışarıdan
    locales: {
      type: [String],
      default: defaultLocales,
    },
    primaryLocale: {
      type: String,
      default: defaultPrimary,
    },

    excludePatterns: { type: [String], default: [] },
    extraStaticPaths: { type: [{ path: String, lastModified: String }], default: [] },
    sitemapSplitThreshold: { type: Number, default: 50000 },
    cacheSeconds: { type: Number, default: 3600 },
  },
  { timestamps: true }
);

export const SeoSetting: Model<ISeoSetting> =
  (models.seosetting as Model<ISeoSetting>) ||
  model<ISeoSetting>("seosetting", SeoSettingSchema);

export default SeoSetting;
