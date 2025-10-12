import { Request, Response, NextFunction } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { isValidObjectId } from "@/core/middleware/auth/validation";

export async function ensureMySeller(req: Request, res: Response, next: NextFunction) {
  try {
    const { Seller } = await getTenantModels(req);
    const tenant = (req as any).tenant;

    // ⬇️ hem id hem _id güvenli
    const uid =
      (req as any).user?.id?.toString?.() ||
      (req as any).user?._id?.toString?.();

    if (!uid) { res.status(401).json({ success: false, message: "auth_required" }); return; }

    // admin/moderator impersonation
    const role = (req as any).user?.role;
    const roles: string[] = [role, ...((req as any).user?.roles || [])].filter(Boolean);
    const canOverride = roles.includes("admin") || roles.includes("moderator") || roles.includes("superadmin");
    const overrideId = String((req.query.asSellerId as string) || req.header("x-as-seller-id") || "");

    if (canOverride && isValidObjectId(overrideId)) {
      const found = await Seller.findOne({ _id: overrideId, tenant }).select({ _id: 1 }).lean();
      if (!found) { res.status(404).json({ success: false, message: "seller_not_found_for_override" }); return; }
      (req as any).mySellerId = String(found._id);
      return next();
    }

    const doc = await Seller.findOne({ tenant, userRef: uid }).select({ _id: 1 }).lean();
    if (!doc) { res.status(403).json({ success: false, message: "seller_profile_required" }); return; }

    (req as any).mySellerId = doc._id.toString();
    next();
  } catch (e) { next(e); }
}
