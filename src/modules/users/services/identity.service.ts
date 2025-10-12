// src/modules/users/services/identity.service.ts
import type { Request } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

export type Provider = "local" | "google" | "facebook";

export async function listProviders(req: Request, userId: string) {
  const tenant = (req as any).tenant as string;
  const { AuthIdentity } = await getTenantModels(req);
  const ids = await AuthIdentity.find({ tenant, userId }).lean();
  const set = new Set(ids.map((i: any) => i.provider));
  return { local: set.has("local"), google: set.has("google"), facebook: set.has("facebook") };
}

export async function linkIdentity(
  req: Request,
  args: { userId: string; provider: Provider; providerId: string }
) {
  const tenant = (req as any).tenant as string;
  const { AuthIdentity } = await getTenantModels(req);
  await AuthIdentity.updateOne(
    { tenant, provider: args.provider, providerId: args.providerId },
    { $setOnInsert: { tenant, provider: args.provider, providerId: args.providerId, userId: args.userId } },
    { upsert: true }
  );
}

export async function ensureLinkable(
  req: Request,
  args: { provider: Provider; providerId: string; currentUserId: string }
) {
  const tenant = (req as any).tenant as string;
  const { AuthIdentity } = await getTenantModels(req);
  const exists = await AuthIdentity.findOne({ tenant, provider: args.provider, providerId: args.providerId });
  if (exists && String(exists.userId) !== String(args.currentUserId)) {
    const err: any = new Error(`${args.provider} account already linked to another user.`);
    err.status = 409;
    throw err;
  }
}

export async function unlinkIdentity(
  req: Request,
  args: { userId: string; provider: Exclude<Provider, "local"> }
) {
  const tenant = (req as any).tenant as string;
  const { AuthIdentity } = await getTenantModels(req);

  const all = await AuthIdentity.find({ tenant, userId: args.userId });
  if (all.length <= 1) {
    const err: any = new Error("Cannot unlink the last remaining identity.");
    err.status = 400;
    throw err;
  }

  const del = await AuthIdentity.deleteOne({ tenant, userId: args.userId, provider: args.provider });
  if (!del.deletedCount) {
    const err: any = new Error("Provider not linked.");
    err.status = 404;
    throw err;
  }
  return listProviders(req, args.userId);
}

/** E-posta değişiminde local providerId’ı güvenli güncelle */
export async function setLocalEmailIdentity(req: Request, args: { userId: string; newEmail: string }) {
  const tenant = (req as any).tenant as string;
  const { AuthIdentity } = await getTenantModels(req);

  // Çakışma kontrolü
  const other = await AuthIdentity.findOne({ tenant, provider: "local", providerId: args.newEmail });
  if (other && String(other.userId) !== String(args.userId)) {
    const err: any = new Error("Email already linked to another account.");
    err.status = 409;
    throw err;
  }

  await AuthIdentity.updateOne(
    { tenant, userId: args.userId, provider: "local" },
    { $set: { providerId: args.newEmail } },
    { upsert: true }
  );
}
