// models/user.model.ts
import mongoose, { Schema, Model, models } from "mongoose";
import {
  hashPassword,
  isPasswordHashed,
  comparePasswords,
} from "@/core/utils/authUtils";
import type { IUser, IUserProfileImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// --- Profile Image Embedded Subschema ---
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

// --- Main User Schema ---
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    company: { type: String, required: false },
    customerId: { type: Schema.Types.ObjectId, ref: "customer" },
    position: { type: String, required: false },
    tenant: { type: String, required: true, index: true },

    email: {
      type: String,
      required: true,
      unique: true, // mevcut davranışı bozmayalım
      match: /.+\@.+\..+/,
    },

    password: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ["superadmin", "admin", "user", "customer", "moderator", "staff"],
      default: "user",
    },

    addresses: [{ type: Schema.Types.ObjectId, ref: "address" }],
    payment: { type: Schema.Types.ObjectId, ref: "payment" },
    cart: { type: Schema.Types.ObjectId, ref: "cart" },
    orders: [{ type: Schema.Types.ObjectId, ref: "order" }],

    phone: { type: String },
    bio: { type: String, default: "" },
    birthDate: { type: Date },

    language: {
      type: String,
      enum: SUPPORTED_LOCALES,
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
    favorites: [{ type: Schema.Types.ObjectId, ref: "product" }],

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

    passwordResetToken: { type: String },   // mevcut kullanımını bozmayayım diye select:false yapmadım
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

// --- Password Hash Middleware (create/update) ---
userSchema.pre("save", async function (next) {
  const user = this as mongoose.Document & IUser;
  if (user.isModified("password") && !isPasswordHashed((user as any).password)) {
    (user as any).password = await hashPassword((user as any).password);
  }
  next();
});

// Şifreyi findOneAndUpdate ile güncellerken de hashle
userSchema.pre("findOneAndUpdate", async function (next) {
  const update: any = this.getUpdate() || {};
  // doğrudan veya $set içinde gelebilir
  const raw = update.password ?? update.$set?.password;
  if (raw && !isPasswordHashed(raw)) {
    const hashed = await hashPassword(raw);
    if (update.$set) update.$set.password = hashed;
    else update.password = hashed;
  }
  next();
});

// --- Instance Methods ---
userSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return comparePasswords(candidatePassword, (this as any).password);
};
userSchema.methods.isPasswordHashed = function (this: IUser): boolean {
  return isPasswordHashed((this as any).password);
};

// --- Helpful non-breaking indexes (listeleme/filtre performansı) ---
userSchema.index({ tenant: 1, role: 1, isActive: 1 });
userSchema.index({ tenant: 1, emailVerified: 1 });
userSchema.index({ tenant: 1, name: 1 });

const User: IUserModel =
  (models.user as IUserModel) || mongoose.model<IUser, IUserModel>("user", userSchema);

export { User };
