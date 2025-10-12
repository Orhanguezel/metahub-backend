// src/modules/users/types/user.types.ts

import { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";  // ← Senin merkezi locale tipin!
import type { Address } from "@/modules/address/types";
import type { AppRole } from "@/types/roles";

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
  tenant: string;
  email: string;
  password: string;
  role: AppRole;                 // ← mevcut alan (tekil, “primary” rol)
  roles?: AppRole[];
  phone?: string;
  cart?: Types.ObjectId;
  orders?: Types.ObjectId[];
  payment?: Types.ObjectId;
  deleted?: {
    isDeleted: boolean;
    deletedAt: Date | null;
    reason: string | null;
  };
  addresses?: (Types.ObjectId | string)[];
  addressesPopulated?: Address[];
  profileImage?: IUserProfileImage;
  isActive: boolean;
  favorites?: Types.ObjectId[];
  bio?: string;
  birthDate?: Date;
  language?: SupportedLocale;
  socialMedia?: SocialMedia;
  notifications?: Notifications;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  verifiedAt?: Date;
  otpCode?: string;
  otpExpires?: Date;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  customerId?: Types.ObjectId | string;   // ← ← ←  🟢 **BURASI**
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isPasswordHashed(): boolean;
}

