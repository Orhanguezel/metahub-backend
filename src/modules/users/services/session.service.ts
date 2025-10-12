// src/modules/users/services/session.service.ts
import type { Request, Response } from "express";
import { generateToken } from "@/core/middleware/auth/token";
import { setTokenCookie, clearTokenCookie } from "@/core/middleware/auth/cookie";

type SessionPayload = { id: string; role: string };

export function issueSession(req: Request, res: Response, payload: SessionPayload) {
  const tenantData = (req as any).tenantData;
  const token = generateToken(payload);
  setTokenCookie(res, token, tenantData);
}

export function clearSession(_req: Request, res: Response) {
  const tenantData = (_req as any).tenantData;
  clearTokenCookie(res, tenantData);
}
