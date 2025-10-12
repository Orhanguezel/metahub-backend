// src/modules/users/services/password-change.service.ts
import type { Request } from "express";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { comparePasswords, hashPassword } from "@/core/middleware/auth/authUtils";

export async function changePasswordService(
  req: Request,
  currentUserId: string,
  currentPassword: string,
  newPassword: string
) {
  const tenant = (req as any).tenant as string;
  const { User } = await getTenantModels(req);
  const user = await User.findOne({ _id: currentUserId, tenant }).select("+password");
  if (!user || user.isActive === false) {
    const err: any = new Error("User inactive");
    err.status = 401;
    throw err;
  }
  const ok = await comparePasswords(currentPassword, user.password);
  if (!ok) {
    const err: any = new Error("Bad credentials");
    err.status = 401;
    throw err;
  }
  if (await comparePasswords(newPassword, user.password)) {
    const err: any = new Error("New password must differ");
    err.status = 422;
    throw err;
  }

  user.password = await hashPassword(newPassword);
  await user.save();
  return user;
}
