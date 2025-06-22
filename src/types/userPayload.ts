// src/types/userPayload.ts
export interface UserPayload {
  id: string;
  _id?: string;
  role: "superadmin" | "admin" | "user" | "customer" | "moderator" | "staff";
  email?: string;
  name?: string;
  isActive?: boolean;
  isSuperadmin?: boolean;
  iat?: number;
  exp?: number;
}
