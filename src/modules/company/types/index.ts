// src/modules/company/types/index.ts
import type { TranslatedLabel} from "@/types/common";

export interface ICompanyImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ICompany {
  companyName: string;
  tenant: string;
  language: string; // "en" | "de" | "tr" gibi — sadece ana dil!
  taxNumber: string;
  handelsregisterNumber?: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  bankDetails: {
    bankName: string;
    iban: string;
    swiftCode: string;
  };
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
