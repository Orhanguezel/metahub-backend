// models/company.model.ts

import { Schema, Model, Types, models, model } from "mongoose";
import type { ICompany, ICompanyImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const CompanyImageSchema = new Schema<ICompanyImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const CompanySchema = new Schema<ICompany>(
  {
    companyName: localizedStringField(),
    companyDesc: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      required: true,
      default: "en",
    },
    taxNumber: { type: String, required: true },
    handelsregisterNumber: { type: String },
    registerCourt: { type: String }, // *** EKLE ***
    website: { type: String }, // *** EKLE ***
    managers: { type: [String], default: [] }, // *** EKLE ***
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    addresses: [{ type: Schema.Types.ObjectId, ref: "address" }],
    bankDetails: {
      bankName: { type: String, required: true },
      iban: { type: String, required: true },
      swiftCode: { type: String, required: true },
    },
    images: { type: [CompanyImageSchema], default: [] },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      linkedin: { type: String },
      youtube: { type: String },
    },
  },
  { timestamps: true }
);

const Company: Model<ICompany> =
  models.company || model<ICompany>("company", CompanySchema);

export { Company, CompanyImageSchema, CompanySchema };
