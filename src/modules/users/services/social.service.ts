// src/modules/users/services/social.service.ts
import type { Request } from "express";
import axios from "axios";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { hashPassword } from "@/core/middleware/auth/authUtils";
import { linkIdentity, ensureLinkable, listProviders } from "./identity.service";

function randomPassword(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Tenant bazlı auth config okuma (env fallback’li ama tenantData > env) */
function getAuthConfig(req: Request) {
  const td = (req as any).tenantData || {};
  const googleClientId =
    td?.auth?.google?.clientId ||
    td?.auth?.googleClientId ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const facebookAppId =
    td?.auth?.facebook?.appId ||
    td?.auth?.facebookAppId ||
    process.env.FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  const devMode =
    Boolean(td?.settings?.authLiteDevMode) ||
    Boolean(td?.debug?.authDev) ||
    process.env.AUTHLITE_DEV_MODE === "1" ||
    (process.env.NODE_ENV !== "production");

  return { googleClientId, facebookAppId, devMode };
}

/* --------------------- Google: login/register/link --------------------- */
export async function loginWithGoogleService(req: Request, idToken: string) {
  const tenant = (req as any).tenant as string;
  const { User, AuthIdentity } = await getTenantModels(req);
  const { googleClientId, devMode } = getAuthConfig(req);

  if (!idToken) {
    const err: any = new Error("Missing idToken");
    err.status = 400;
    throw err;
  }

  // DEV override
  if (devMode && idToken.startsWith("debug:")) {
    const email = idToken.substring(6).toLowerCase().trim();
    const name = email.split("@")[0];
    let user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({
        tenant, email, name, password: hashed, role: "user", isActive: true,
      });
    }
    await linkIdentity(req, { userId: user._id.toString(), provider: "google", providerId: `dev:${email}` });
    return user;
  }

  if (!googleClientId || typeof idToken !== "string" || idToken.split(".").length !== 3) {
    const err: any = new Error("Google not configured or invalid idToken");
    err.status = 400;
    throw err;
  }

  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
  const payload = ticket.getPayload();
  const googleId = payload?.sub;
  const email = (payload?.email || "").toLowerCase();
  const name = payload?.name || email?.split("@")[0];

  if (!googleId) {
    const err: any = new Error("Google verification failed");
    err.status = 401;
    throw err;
  }

  let identity = await AuthIdentity.findOne({ tenant, provider: "google", providerId: googleId });
  let user: any = null;

  if (identity) {
    user = await User.findOne({ _id: identity.userId, tenant });
  } else if (email) {
    user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({ tenant, email, name, password: hashed, role: "user", isActive: true });
    }
    await linkIdentity(req, { userId: user._id.toString(), provider: "google", providerId: googleId });
  } else {
    const hashed = await hashPassword(randomPassword());
    user = await User.create({ tenant, name, password: hashed, role: "user", isActive: true });
    await linkIdentity(req, { userId: user._id.toString(), provider: "google", providerId: googleId });
  }

  if (!user || user.isActive === false) {
    const err: any = new Error("User inactive");
    err.status = 401;
    throw err;
  }

  return user;
}

export async function linkGoogleAccountService(req: Request, currentUserId: string, idToken: string) {
  const { googleClientId, devMode } = getAuthConfig(req);
  if (!idToken) {
    const err: any = new Error("Missing idToken");
    err.status = 400;
    throw err;
  }

  // DEV override
  if (devMode && idToken.startsWith("debug:")) {
    const email = idToken.substring(6).toLowerCase().trim();
    const providerId = `dev:${email}`;
    await ensureLinkable(req, { provider: "google", providerId, currentUserId });
    await linkIdentity(req, { userId: currentUserId, provider: "google", providerId });
    return listProviders(req, currentUserId);
  }

  if (!googleClientId) {
    const err: any = new Error("Google not configured");
    err.status = 400;
    throw err;
  }
  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
  const payload = ticket.getPayload();
  const googleId = payload?.sub;
  if (!googleId) {
    const err: any = new Error("Google verification failed");
    err.status = 401;
    throw err;
  }

  await ensureLinkable(req, { provider: "google", providerId: googleId, currentUserId });
  await linkIdentity(req, { userId: currentUserId, provider: "google", providerId: googleId });
  return listProviders(req, currentUserId);
}

/* ------------------- Facebook: login/register/link --------------------- */
export async function loginWithFacebookService(req: Request, accessToken: string) {
  const tenant = (req as any).tenant as string;
  const { User, AuthIdentity } = await getTenantModels(req);
  const { facebookAppId, devMode } = getAuthConfig(req);

  if (!accessToken) {
    const err: any = new Error("Missing accessToken");
    err.status = 400;
    throw err;
  }

  // DEV override
  if (devMode && accessToken.startsWith("debug:")) {
    const email = accessToken.substring(6).toLowerCase().trim();
    const name = email.split("@")[0];
    let user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({
        tenant, email, name, password: hashed, role: "user", isActive: true,
      });
    }
    await linkIdentity(req, { userId: user._id.toString(), provider: "facebook", providerId: `dev:${email}` });
    return user;
  }

  if (!facebookAppId) {
    const err: any = new Error("Facebook not configured");
    err.status = 400;
    throw err;
  }

  const fbRes = await axios.get("https://graph.facebook.com/me", {
    params: { fields: "id,name,email", access_token: accessToken },
  }).catch(() => null);

  const fb = fbRes?.data;
  const facebookId: string | undefined = fb?.id;
  const email = (fb?.email || "").toLowerCase();
  const name = fb?.name || email?.split("@")[0];

  if (!facebookId) {
    const err: any = new Error("Facebook verification failed");
    err.status = 401;
    throw err;
  }

  let identity = await AuthIdentity.findOne({ tenant, provider: "facebook", providerId: facebookId });
  let user: any = null;

  if (identity) {
    user = await User.findOne({ _id: identity.userId, tenant });
  } else if (email) {
    user = await User.findOne({ tenant, email });
    if (!user) {
      const hashed = await hashPassword(randomPassword());
      user = await User.create({ tenant, email, name, password: hashed, role: "user", isActive: true });
    }
    await linkIdentity(req, { userId: user._id.toString(), provider: "facebook", providerId: facebookId });
  } else {
    const hashed = await hashPassword(randomPassword());
    user = await User.create({ tenant, name, password: hashed, role: "user", isActive: true });
    await linkIdentity(req, { userId: user._id.toString(), provider: "facebook", providerId: facebookId });
  }

  if (!user || user.isActive === false) {
    const err: any = new Error("User inactive");
    err.status = 401;
    throw err;
  }
  return user;
}

export async function linkFacebookAccountService(req: Request, currentUserId: string, accessToken: string) {
  const { facebookAppId, devMode } = getAuthConfig(req);
  if (!accessToken) {
    const err: any = new Error("Missing accessToken");
    err.status = 400;
    throw err;
  }

  // DEV override
  if (devMode && accessToken.startsWith("debug:")) {
    const email = accessToken.substring(6).toLowerCase().trim();
    const providerId = `dev:${email}`;
    await ensureLinkable(req, { provider: "facebook", providerId, currentUserId });
    await linkIdentity(req, { userId: currentUserId, provider: "facebook", providerId });
    return listProviders(req, currentUserId);
  }

  if (!facebookAppId) {
    const err: any = new Error("Facebook not configured");
    err.status = 400;
    throw err;
  }

  const fbRes = await axios.get("https://graph.facebook.com/me", {
    params: { fields: "id", access_token: accessToken },
  }).catch(() => null);
  const facebookId = fbRes?.data?.id as string | undefined;
  if (!facebookId) {
    const err: any = new Error("Facebook verification failed");
    err.status = 401;
    throw err;
  }

  await ensureLinkable(req, { provider: "facebook", providerId: facebookId, currentUserId });
  await linkIdentity(req, { userId: currentUserId, provider: "facebook", providerId: facebookId });
  return listProviders(req, currentUserId);
}
