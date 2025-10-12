// src/modules/storefront/model.ts
import { Schema, model, models, type Model } from "mongoose";
import type { IStorefrontSettings, IMenuItem, IBannerItem } from "./types";

const JsonLooseSchema = new Schema<Record<string, any>>({}, { _id: false, strict: false });

const MenuItemSchema = new Schema<IMenuItem>(
  {
    key: String,
    title: String,
    url: String,
    icon: String,
    children: { type: [JsonLooseSchema], default: [] },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false, strict: false }
);

const BannerItemSchema = new Schema<IBannerItem>(
  {
    key: String,
    title: String,
    subtitle: String,

    mediaId: { type: Schema.Types.ObjectId, ref: "mediaasset" },

    image: String,
    thumbnail: String,
    webp: String,

    href: String,
    position: String,
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    meta: {
      width: Number,
      height: Number,
      mime: String,
    },
  },
  { _id: false, strict: false }
);

const StorefrontSettingsSchema = new Schema<IStorefrontSettings>(
  {
    tenant: { type: String, required: true, index: true, unique: true },

    currency: { type: String, required: true, default: "USD" },
    currencies: { type: [String], default: [] },
    locale: { type: String, required: true, default: "tr-TR" },
    locales: { type: [String], default: [] },

    priceIncludesTax: { type: Boolean, default: false },
    measurement: { type: String, enum: ["metric", "imperial"], default: "metric" },

    menus: { type: [MenuItemSchema], default: [] },
    banners: { type: [BannerItemSchema], default: [] },

    featuredCategories: { type: [String], default: [] },
    featuredProducts: { type: [String], default: [] },

    socials: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

StorefrontSettingsSchema.pre("save", function (next) {
  if (this.currency) this.currency = this.currency.toUpperCase();

  if (Array.isArray(this.currencies)) {
    this.currencies = Array.from(new Set(this.currencies.map((c) => String(c).toUpperCase())));
  }

  if (this.locale) this.locale = String(this.locale).trim();
  if (Array.isArray(this.locales)) {
    this.locales = Array.from(new Set(this.locales.map((l) => String(l).trim())));
  }

  next();
});

export const StorefrontSettings: Model<IStorefrontSettings> =
  models.storefrontsettings || model<IStorefrontSettings>("storefrontsettings", StorefrontSettingsSchema);

export default StorefrontSettings;
