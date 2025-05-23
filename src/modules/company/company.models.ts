import mongoose, { Schema, Model, models } from "mongoose";

export interface ICompanyImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ICompany {
  companyName: string;
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
  logos?: ICompanyImage[];
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

const CompanyImageSchema = new Schema<ICompanyImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const companySchema = new Schema<ICompany>(
  {
    companyName: { type: String, required: true, unique: true },
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
    logos: { type: [CompanyImageSchema], default: [] },
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
  models.Company || mongoose.model<ICompany>("Company", companySchema);

export { Company };
