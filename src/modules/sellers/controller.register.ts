import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { comparePasswords } from "@/core/middleware/auth/authUtils";
import { linkIdentity as linkIdentitySvc } from "@/modules/users/services/identity.service";
import { issueSession } from "@/modules/users/services/session.service";
import { createSellerForUser } from "./service/sellerForUser.service";

const normEmail = (s?: string) => (s || "").trim().toLowerCase();
const normPhone = (s?: string) => {
  if (!s) return s;
  let v = s.trim().replace(/[\s()-]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  v = v.replace(/(?!^\+)\+/g, "");
  v = v.replace(/[^\d+]/g, "");
  return v;
};
const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const toIdArray = (v: any) => {
  const raw = parseIfJson(v);
  if (Array.isArray(raw)) return raw.map(String).filter(x => /^[0-9a-fA-F]{24}$/.test(x));
  if (typeof raw === "string") {
    if (/^\[/.test(raw)) return (parseIfJson(raw) || []).filter((x: any) => /^[0-9a-fA-F]{24}$/.test(String(x)));
    return raw.split(",").map(s => s.trim()).filter(x => /^[0-9a-fA-F]{24}$/.test(x));
  }
  return [];
};

const parseTags = (v: any): string[] => {
  const raw = parseIfJson(v);
  const arr = Array.isArray(raw)
    ? raw
    : (typeof raw === "string" ? raw.split(",") : []);
  return Array.from(new Set(arr
    .filter(Boolean)
    .map((t: any) => String(t).trim().toLowerCase())));
};

const parseLocation = (v: any) => {
  const loc = parseIfJson(v) || {};
  const country = loc?.country ? String(loc.country).trim() : undefined;
  const city    = loc?.city ? String(loc.city).trim() : undefined;
  return (country || city) ? { country, city } : undefined;
};

const parseBilling = (v: any) => {
  const b = parseIfJson(v) || undefined;
  if (!b) return undefined;
  const out: any = {
    taxNumber: b.taxNumber || undefined,
    iban: b.iban || undefined,
    defaultCurrency: b.defaultCurrency || undefined,
  };
  if (b.paymentTermDays !== undefined) out.paymentTermDays = Number(b.paymentTermDays);
  if (b.defaultDueDayOfMonth !== undefined) out.defaultDueDayOfMonth = Number(b.defaultDueDayOfMonth);
  return out;
};

/**
 * POST /api/sellers/register-email
 */
export const registerSellerEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, shopName, phone, notes, categories, location, billing, tags } = (req.body || {}) as any;
  const tenant = (req as any).tenant as string;
  const { User } = await getTenantModels(req);

  const e = normEmail(email);
  if (!e || !password) {
    res.status(400).json({ success: false, message: "email_and_password_required" });
    return;
  }

  const user: any = await User.findOne({ tenant, email: e }).select("+password");
  if (!user) {
    res.status(409).json({ success: false, message: "user_must_register_first" });
    return;
  }

  const ok = await comparePasswords(password, user.password);
  if (!ok) {
    res.status(401).json({ success: false, message: "bad_credentials" });
    return;
  }

  const seller = await createSellerForUser(req, user._id.toString(), {
    shopName,
    contactName: name || user.name,
    email: e,
    phone: normPhone(phone),
    notes,
    categories: toIdArray(categories),
    location: parseLocation(location),
    billing : parseBilling(billing),
    tags    : parseTags(tags),
  });

  await linkIdentitySvc(req, { userId: user._id.toString(), provider: "local", providerId: e });
  issueSession(req, res, { id: user._id.toString(), role: "seller" });

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: "seller",
        roles: Array.isArray(user.roles) ? user.roles : ["user", "seller"],
      },
      seller,
    },
  });
});

/**
 * POST /api/sellers/apply  (auth required)
 */
export const applyAsSeller = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as any).user;
  if (!auth?.id) { res.status(401).json({ success: false, message: "auth_required" }); return; }

  const { shopName, phone, email, contactName, notes, categories, location, billing, tags } = (req.body || {}) as any;

  const seller = await createSellerForUser(req, String(auth.id), {
    shopName,
    phone: normPhone(phone),
    email: normEmail(email) || (auth.email as string),
    contactName,
    notes,
    categories: toIdArray(categories),
    location: parseLocation(location),
    billing : parseBilling(billing),
    tags    : parseTags(tags),
  });

  issueSession(req, res, { id: String(auth.id), role: "seller" });
  res.status(201).json({ success: true, data: seller });
});
