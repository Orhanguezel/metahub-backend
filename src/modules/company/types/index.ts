// src/modules/company/types/index.ts
import type { SupportedLocale } from "@/types/common";
import type { Types, Document } from "mongoose";

export type TranslatedLabel = { [key in SupportedLocale]: string };

export interface ICompanyImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ICompany {
  companyName: TranslatedLabel;
  companyDesc?: TranslatedLabel;             // Kısa açıklama/alan
  tenant: string;
  language: string; // "en" | "de" | "tr" gibi — sadece ana dil!
  taxNumber: string;
  handelsregisterNumber?: string;
  registerCourt?: string;  
  website?: string;
  email: string;
  phone: string;
  addresses?: Array<Types.ObjectId | string>;
  bankDetails: {
    bankName: string;
    iban: string;
    swiftCode: string;
  };
  managers?: string[];
  images?: ICompanyImage[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
