// models/company.model.ts

import mongoose, { Schema, Model, models } from "mongoose";
import type { ICompany, ICompanyImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

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
    companyName: { type: String, required: true, unique: true },
    tenant: { type: String, required: true, index: true },
    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
      required: true,
      default: "en",
    },
    taxNumber: { type: String, required: true },
    handelsregisterNumber: { type: String },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
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
  models.Company || mongoose.model<ICompany>("Company", CompanySchema);

export { Company };
