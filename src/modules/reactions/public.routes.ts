// src/modules/reactions/public.routes.ts
import express from "express";
import {
  rate,
  getRatingSummary,
  toggleReaction,
  setReaction,
  getSummary,
  getMyReactions,
} from "./public.controller";
import {
  validateRate,
  validateRatingSummaryQuery,
  validateToggle,
  validateSet,
  validateSummaryQuery,
  validateMyQuery,
} from "./validation";

import type { RequestHandler } from "express";
import { Types, isValidObjectId } from "mongoose";

/** Guest kimliği üreten middleware
 *  - Login varsa dokunmaz
 *  - Yoksa rx_uid cookie (httpOnly) set eder ve req.user atar
 *  Not: cookie-parser yüklü olmalı ve CORS 'credentials: true' açık olmalı.
 */
const ensureActor: RequestHandler = (req, res, next) => {
  const u = (req as any).user;
  if (u?._id && isValidObjectId(u._id)) return next();

  const rxCookie = (req as any).cookies?.rx_uid;
  const validCookie = rxCookie && isValidObjectId(rxCookie);
  const id = validCookie ? rxCookie : new Types.ObjectId().toString();

  const isProd = process.env.NODE_ENV === "production";
  res.cookie("rx_uid", id, {
    httpOnly: true,
    // local dev'de cookie set edilsin diye:
    secure: isProd,                 // prod: true, dev: false
    sameSite: isProd ? "none" : "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  (req as any).user = { _id: id, isGuest: true };
  next();
};

const router = express.Router();

// 🔓 Tüm public uçlar guest destekli
router.post("/toggle", ensureActor, validateToggle, toggleReaction);
router.post("/set",    ensureActor, validateSet,    setReaction);
router.post("/rate",   ensureActor, validateRate,   rate);

router.get("/ratings/summary", validateRatingSummaryQuery, getRatingSummary);
router.get("/summary",         validateSummaryQuery,       getSummary);

// Kişisel reaksiyonlar da guest id ile dönebilir
router.get("/me", ensureActor, validateMyQuery, getMyReactions);

export default router;
