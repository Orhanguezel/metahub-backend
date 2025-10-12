import { Schema, model, models, type Model } from "mongoose";
import type { IAuthIdentity, IPasswordReset, IEmailChange } from "./types";

/** Global şema + model tanımları. Tenant binding controller içinde yapılır. */

/* ---------------- AuthIdentity ---------------- */
const AuthIdentitySchema = new Schema<IAuthIdentity>(
  {
    tenant:     { type: String, required: true, index: true, trim: true },
    userId:     { type: Schema.Types.ObjectId, required: true, ref: "user" },
    provider:   { type: String, enum: ["local", "google", "facebook"], required: true },
    providerId: { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false, strict: true, minimize: false }
);

AuthIdentitySchema.index({ tenant: 1, provider: 1, providerId: 1 }, { unique: true });
AuthIdentitySchema.index({ tenant: 1, userId: 1 });

export const AuthIdentity: Model<IAuthIdentity> =
  (models.authidentity as Model<IAuthIdentity>) ||
  model<IAuthIdentity>("authidentity", AuthIdentitySchema);

/* ---------------- PasswordReset ---------------- */
const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    tenant:    { type: String, required: true, index: true, trim: true },
    email:     { type: String, required: true, lowercase: true, trim: true, index: true },
    userId:    { type: Schema.Types.ObjectId, required: true, ref: "user" },
    code:      { type: String, required: true, trim: true },
    token:     { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    usedAt:    { type: Date },
    ip:        { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false, strict: true, minimize: false }
);

PasswordResetSchema.index({ tenant: 1, email: 1, createdAt: -1 });
PasswordResetSchema.index({ tenant: 1, email: 1, code: 1 });
PasswordResetSchema.index({ tenant: 1, email: 1, token: 1 });
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset: Model<IPasswordReset> =
  (models.passwordreset as Model<IPasswordReset>) ||
  model<IPasswordReset>("passwordreset", PasswordResetSchema);

/* ---------------- EmailChange ---------------- */
const EmailChangeSchema = new Schema<IEmailChange>(
  {
    tenant:    { type: String, required: true, index: true, trim: true },
    userId:    { type: Schema.Types.ObjectId, required: true, ref: "user" },
    oldEmail:  { type: String, required: true, lowercase: true, trim: true, index: true },
    newEmail:  { type: String, required: true, lowercase: true, trim: true, index: true },
    code:      { type: String, required: true, trim: true },
    token:     { type: String, required: true, trim: true },
    expiresAt: { type: Date, required: true },
    usedAt:    { type: Date },
    ip:        { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false, strict: true, minimize: false }
);

EmailChangeSchema.index({ tenant: 1, newEmail: 1, createdAt: -1 });
EmailChangeSchema.index({ tenant: 1, userId: 1, createdAt: -1 });
EmailChangeSchema.index({ tenant: 1, newEmail: 1, code: 1 });
EmailChangeSchema.index({ tenant: 1, newEmail: 1, token: 1 });
EmailChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EmailChange: Model<IEmailChange> =
  (models.emailchange as Model<IEmailChange>) ||
  model<IEmailChange>("emailchange", EmailChangeSchema);
