import type { Request } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { AppRole } from "@/types/roles";
import { isValidObjectId } from "mongoose";

/* ----------------- helpers ----------------- */
const normEmail = (s?: string) => (s || "").trim().toLowerCase();
const normPhone = (s?: string) => {
  if (!s) return s;
  let v = s.trim().replace(/[\s()-]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  v = v.replace(/(?!^\+)\+/g, "");
  v = v.replace(/[^\d+]/g, "");
  return v;
};

const toIdArray = (v: any): string[] => {
  const arr = Array.isArray(v) ? v : v == null ? [] : [v];
  const out = arr
    .map(String)
    .map((s) => s.trim())
    .filter((s) => isValidObjectId(s));
  return Array.from(new Set(out));
};

const sanitizeTags = (v: any): string[] | undefined => {
  if (v == null) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const out = arr
    .map((x) => String(x || "").trim().toLowerCase())
    .filter(Boolean);
  return out.length ? Array.from(new Set(out)) : undefined;
};

const sanitizeLocation = (loc: any) => {
  if (!loc) return undefined;
  const country = loc?.country ? String(loc.country).trim() : undefined;
  const city    = loc?.city ? String(loc.city).trim() : undefined;
  return (country || city) ? { country, city } : undefined;
};

const sanitizeBilling = (b: any) => {
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

/* --------------- public API types --------------- */
export interface CreateSellerForUserInput {
  shopName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  /** Satıcının hizmet verdiği kategori id'leri (ObjectId string[]) */
  categories?: string[];
  /** Opsiyonel ek alanlar */
  location?: { country?: string; city?: string };
  billing?: {
    taxNumber?: string;
    iban?: string;
    defaultCurrency?: "USD" | "EUR" | "TRY";
    paymentTermDays?: number;
    defaultDueDayOfMonth?: number;
  };
  tags?: string[];
}

/* ---------------- role ensure ---------------- */
export async function ensureSellerRole(req: Request, userDoc: any) {
  const next: AppRole[] = Array.isArray(userDoc.roles) ? [...userDoc.roles] : [];
  if (!next.includes("seller")) next.push("seller");
  userDoc.roles = next;
  await userDoc.save();
}

/* --------------- main: create or return existing --------------- */
export async function createSellerForUser(
  req: Request,
  userId: string,
  payload: CreateSellerForUserInput
) {
  const tenant = (req as any).tenant as string;
  const { Seller, User, Category } = await getTenantModels(req);

  const u = await User.findOne({ _id: userId, tenant });
  if (!u) throw Object.assign(new Error("user_not_found"), { status: 404 });

  // Kategorileri normalize + (varsa) doğrula (tenant scoped)
  const incomingCats = toIdArray(payload.categories);
  let validCats: string[] = incomingCats;
  if (incomingCats.length && Category) {
    const rows = await Category.find({ tenant, _id: { $in: incomingCats } })
      .select({ _id: 1 })
      .lean();
    validCats = rows.map((r: any) => String(r._id));
  }

  // varsa: patch + dön (idempotent)
  const existing = await Seller.findOne({ tenant, userRef: u._id });
  if (existing) {
    let changed = false;

    if (incomingCats.length) {
      // Doğrulanan yoksa bile gelenleri yaz (gelenler 24-hex ise)
      (existing as any).categories = validCats.length ? validCats : incomingCats;
      changed = true;
    }
    if (payload.notes !== undefined) { (existing as any).notes = payload.notes; changed = true; }

    const loc = sanitizeLocation(payload.location);
    if (loc) { (existing as any).location = loc; changed = true; }

    const bill = sanitizeBilling(payload.billing);
    if (bill) { (existing as any).billing = bill; changed = true; }

    const t = sanitizeTags(payload.tags);
    if (t) { (existing as any).tags = t; changed = true; }

    if (changed) await existing.save();
    await ensureSellerRole(req, u);
    return existing;
  }

  const email = normEmail(payload.email || u.email);
  const phone = normPhone(payload.phone || (u as any).phone);

  // benzersizlik
  if (await Seller.findOne({ tenant, email })) {
    throw Object.assign(new Error("seller_email_exists"), { status: 409 });
  }
  if (phone && (await Seller.findOne({ tenant, phone }))) {
    throw Object.assign(new Error("seller_phone_exists"), { status: 409 });
  }

  // Yeni kayıtta: doğrulanan varsa onu, yoksa gelenleri kullan
  const finalCats = validCats.length ? validCats : incomingCats;
  if (!finalCats.length) {
    // ilk kayıt için kategori şart
    throw Object.assign(new Error("categories_required"), { status: 400 });
  }

  const doc = await Seller.create({
    tenant,
    kind: "person",
    companyName: payload.shopName || (u as any).company || u.name,
    contactName: payload.contactName || u.name || (email?.split("@")?.[0] ?? ""),
    email,
    phone,
    userRef: u._id,
    notes: payload.notes,
    isActive: true,
    categories: finalCats,
    location: sanitizeLocation(payload.location),
    billing : sanitizeBilling(payload.billing),
    tags    : sanitizeTags(payload.tags),
  });

  await ensureSellerRole(req, u);
  return doc;
}
