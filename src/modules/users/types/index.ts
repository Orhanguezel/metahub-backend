import { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";  // ← Senin merkezi locale tipin!
import type { Address } from "@/modules/address/types";

export interface IUserProfileImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface Notifications {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface SocialMedia {
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// --- FINAL USER TIPI ---
export interface IUser {
  name: string;
  company?: string;
  position?: string;
  tenant: string; // Multi-tenancy (her zaman zorunlu!)
  email: string;
  password: string;
  role: "superadmin" | "admin" | "user" | "customer" | "moderator" | "staff";
  phone?: string;
  cart?: Types.ObjectId;
  orders?: Types.ObjectId[];
  payment?: Types.ObjectId;
  profile?: Types.ObjectId;
  deleted?: {
    isDeleted: boolean;
    deletedAt: Date | null;
    reason: string | null;
  };
  addresses?: (Types.ObjectId | string)[];  // ← Sadece referans ID'ler
  addressesPopulated?: Address[];           // ← API response'da gerçek adresler
  profileImage?: IUserProfileImage;
  isActive: boolean;
  favorites?: Types.ObjectId[];
  bio?: string;
  birthDate?: Date;
  language?: SupportedLocale; // ← HER ZAMAN central type'dan
  socialMedia?: SocialMedia;
  notifications?: Notifications;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // --- OTP, MFA, Email Verification fields
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  verifiedAt?: Date;

  otpCode?: string;
  otpExpires?: Date;

  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];

  createdAt: Date;
  updatedAt: Date;

  // --- Methods (instance)
  comparePassword(candidatePassword: string): Promise<boolean>;
  isPasswordHashed(): boolean;
}
