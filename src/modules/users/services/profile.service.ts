// src/modules/users/services/profile.service.ts
import type { Request } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

export async function updateDisplayName(req: Request, userId: string, name?: string) {
  const tenant = (req as any).tenant as string;
  const safeName = typeof name === "string" ? name.trim().slice(0, 120) : undefined;
  const { User } = await getTenantModels(req);

  const doc = await User.findOne({ _id: userId, tenant });
  if (!doc) return null;

  if (safeName !== undefined) doc.name = safeName || doc.name;
  await doc.save();
  return doc;
}
