import type { Types } from "mongoose";

export type ContactKind = "person" | "organization";

export interface IEmail {
  label?: string;          // work, billing...
  value: string;
  primary?: boolean;
}

export interface IPhone {
  label?: string;          // mobile, office, ...
  value: string;
  primary?: boolean;
}

export interface IAddress {
  label?: string;          // billing, office...
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;        // ISO-2
}

export interface IBillingInfo {
  iban?: string;
  bankName?: string;
  taxNumber?: string;      // VKN/Steuernummer
  currency?: string;       // "EUR" | "TRY" | ...
  defaultDueDayOfMonth?: number; // 1..28 (öneri)
}

export interface IContact {
  _id?: Types.ObjectId;

  tenant: string;
  kind: ContactKind;

  // Person
  firstName?: string;
  lastName?: string;

  // Organization
  legalName?: string;
  tradeName?: string;

  slug: string;            // unique per tenant
  emails: IEmail[];
  phones: IPhone[];
  addresses: IAddress[];
  billing?: IBillingInfo;

  notes?: string;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
