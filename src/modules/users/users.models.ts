// src/modules/users/users.models.ts

import mongoose, { Schema, Types, Model, models } from "mongoose";
import {
  hashPassword,
  isPasswordHashed,
  comparePasswords,
} from "@/core/utils/authUtils";

export interface IUserProfileImage {
  url: string;         
  thumbnail: string;   
  webp?: string;      
  publicId?: string;   
}


// -- Subtypes
export interface Notifications {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}
export interface SocialMedia {
  facebook?: string;
  twitter?: string;
  instagram?: string;
}

// -- Main User Interface
export interface IUser {
  name: string;
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
  language?: "tr" | "en" | "de";
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

const UserProfileImageSchema = new Schema<IUserProfileImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

interface IUserModel extends Model<IUser> {}

// --- Schema ---
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /.+\@.+\..+/,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "user", "customer", "moderator", "staff"],
      default: "user",
    },
    profile: { type: Schema.Types.ObjectId, ref: "Profile" },
    addresses: [{ type: Schema.Types.ObjectId, ref: "Address" }],
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
    cart: { type: Schema.Types.ObjectId, ref: "Cart" },
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    phone: { type: String },
    bio: { type: String, default: "" },
    birthDate: { type: Date },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
    profileImage: {
  type: UserProfileImageSchema,
  default: {
    url: "/defaults/profile.png",
    thumbnail: "/defaults/profile-thumbnail.png",
    webp: "/defaults/profile.webp",
    publicId: "",
  },
},
    isActive: { type: Boolean, default: true },
    favorites: [{ type: Schema.Types.ObjectId, ref: "Product" }],

    deleted: {
      isDeleted: { type: Boolean, default: false },
      deletedAt: { type: Date, default: null },
      reason: { type: String, default: null },
    },
    socialMedia: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
    },
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },

    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    // --- Email Verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    verifiedAt: { type: Date },

    // --- OTP
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },

    // --- MFA (2FA, TOTP)
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaBackupCodes: [{ type: String, select: false }],
  },
  { timestamps: true }
);

// --- Password Hash
userSchema.pre("save", async function (next) {
  const user = this as mongoose.Document & IUser;

  if (user.isModified("password") && !isPasswordHashed(user.password)) {
    user.password = await hashPassword(user.password);
  }
  next();
});

// --- Methods
userSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return comparePasswords(candidatePassword, this.password);
};
userSchema.methods.isPasswordHashed = function (this: IUser): boolean {
  return isPasswordHashed(this.password);
};

// --- Guard + Model
const User: IUserModel =
  models.User || mongoose.model<IUser, IUserModel>("User", userSchema);

export { User };
