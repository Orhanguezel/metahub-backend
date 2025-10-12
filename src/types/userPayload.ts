// src/types/userPayload.ts
import type { AppRole } from "./roles";

export interface UserPayload {
  id: string;
  _id?: string;

  // Ana rol + opsiyonel ek roller
  role: AppRole;
  roles?: AppRole[];

  email?: string;
  name?: string;
  isActive?: boolean;
  isSuperadmin?: boolean;

  // İnce taneli yetki/scope (opsiyonel)
  scopes?: string[];
  permissions?: string[];

  iat?: number;
  exp?: number;
}
