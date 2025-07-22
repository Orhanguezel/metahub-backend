import mongoose, { Schema, Model, models } from "mongoose";
import type {
  ITenant,
  TenantDomain,
  TenantEmailSettings,
  TranslatedLabel,
  ITenantImage,
} from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// Dinamik çok dilli field
const translatedFieldSchema = SUPPORTED_LOCALES.reduce((acc, lang) => {
  acc[lang] = { type: String, trim: true, default: "" };
  return acc;
}, {} as Record<string, any>);

const TenantImageSchema = new Schema<ITenantImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

// Domain schema
const TenantDomainSchema = new Schema<TenantDomain>(
  {
    main: { type: String, required: true, trim: true },
    subdomains: [{ type: String }],
    customDomains: [{ type: String }],
  },
  { _id: false }
);

// Email ayarları
const TenantEmailSettingsSchema = new Schema<TenantEmailSettings>(
  {
    // SMTP Ayarları
    smtpHost: { type: String, trim: true },
    smtpPort: { type: Number },
    smtpSecure: { type: Boolean, default: true },
    smtpUser: { type: String, trim: true },
    smtpPass: { type: String, trim: true },
    senderName: { type: String, trim: true },
    senderEmail: { type: String, trim: true },
    // IMAP Ayarları
    imapHost: { type: String, trim: true },
    imapPort: { type: Number },
    imapSecure: { type: Boolean, default: true },
    imapUser: { type: String, trim: true },
    imapPass: { type: String, trim: true },
    // Ekstra
    replyToEmail: { type: String, trim: true },
  },
  { _id: false }
);

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: translatedFieldSchema, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mongoUri: { type: String, required: true, trim: true }, // <-- Eklendi
    domain: { type: TenantDomainSchema },
    emailSettings: { type: TenantEmailSettingsSchema },
    logo: { type: String, default: "" },
    images: { type: [TenantImageSchema], default: [] },
    theme: { type: String, default: "default" },
    isActive: { type: Boolean, default: true },
    description: { type: translatedFieldSchema, default: () => ({}) },
    metaTitle: { type: translatedFieldSchema, default: () => ({}) },
    metaDescription: { type: translatedFieldSchema, default: () => ({}) },
    address: { type: translatedFieldSchema, default: () => ({}) },
    phone: { type: String, default: "" },
    social: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const Tenants: Model<ITenant> =
  models.Tenants || mongoose.model<ITenant>("Tenants", TenantSchema);

export default Tenants;
export { Tenants };
