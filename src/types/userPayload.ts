// src/types/userPayload.ts
export interface UserPayload {
    id: string;
    _id?: string;
    role: "admin" | "user" | "customer" | "moderator" | "staff";
    email?: string;
    name?: string;
    isActive?: boolean;
    iat?: number;
    exp?: number;
  }
  