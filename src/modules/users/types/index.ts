import { Types } from "mongoose";
import type { SupportedLocale } from "@/types/common";

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

// Main User Interface
export interface IUser {
  name: string;
  tenant: string; // Optional tenant field for multi-tenancy
  email: string;
  password: string;
  role: "admin" | "user" | "customer" | "moderator" | "staff";
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
  addresses?: Types.ObjectId[];
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

  comparePassword(candidatePassword: string): Promise<boolean>;
  isPasswordHashed(): boolean;
}
