// src/modules/users/types/authlite.types.ts
import type { Types } from "mongoose";

/** Projenin RBAC rolleri + son-kullanıcı */
export type Role =
  | "superadmin" | "admin" | "manager" | "support"
  | "picker" | "viewer" | "moderator" | "staff"
  | "customer" | "seller" | "user";

export type Provider = "local" | "google" | "facebook";

/* ---------- Models ---------- */
export interface IAuthIdentity {
  tenant: string;
  userId: Types.ObjectId;   // user._id
  provider: Provider;       // "local" | "google" | "facebook"
  providerId: string;       // local: email | google: sub | facebook: id
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPasswordReset {
  tenant: string;
  email: string;            // lowercase
  userId: Types.ObjectId;
  code: string;             // 6 haneli OTP
  token: string;            // random hex (deep link)
  expiresAt: Date;
  usedAt?: Date;
  ip?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEmailChange {
  tenant: string;
  userId: Types.ObjectId;
  oldEmail: string;         // lowercase
  newEmail: string;         // lowercase
  code: string;             // 6 haneli OTP
  token: string;            // random hex (deep link)
  expiresAt: Date;
  usedAt?: Date;
  ip?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------- API payloads ---------- */
export type LiteUserPayload = {
  id: string;
  role: Role;               // tekli ana rol
  roles?: Role[];           // (opsiyonel) çoklu rol desteği
  email?: string;
  name?: string;
  isActive?: boolean;
};

export type RegisterBody = { email: string; password: string; name?: string };
export type LoginBody    = { email: string; password: string };
export type GoogleBody   = { idToken: string };
export type FacebookBody = { accessToken: string };

export type ForgotPasswordBody = { email: string };
export type ResetPasswordBody  = { email: string; code?: string; token?: string; newPassword: string };

export type ChangePasswordBody      = { currentPassword: string; newPassword: string };
export type ChangeEmailStartBody    = { currentPassword: string; newEmail: string };
export type ChangeEmailConfirmBody  = { newEmail: string; code?: string; token?: string };
