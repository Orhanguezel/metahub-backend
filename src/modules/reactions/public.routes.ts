import express from "express";
import { authenticate } from "@/core/middleware/authMiddleware";
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

/** 🔹 Guest kullanıcıyı garanti altına alan middleware
 *  - Login varsa dokunmaz
 *  - Yoksa rx_uid isimli httpOnly cookie ile ObjectId üretir ve req.user._id atar
 *  Not: app seviyesinde cookie-parser yüklü olmalı.
 */
const ensureActor: RequestHandler = (req, res, next) => {
  const u = (req as any).user;
  if (u?. _id && isValidObjectId(u._id)) return next();

  const rxCookie = (req as any).cookies?.rx_uid;
  let id = (rxCookie && isValidObjectId(rxCookie)) ? rxCookie : new Types.ObjectId().toString();

  res.cookie("rx_uid", id, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  (req as any).user = { _id: id, isGuest: true };
  next();
};

const router = express.Router();

// 🔓 Toggle public (guest destekli)
router.post("/toggle", ensureActor, validateToggle, toggleReaction);

// İsterseniz 'set' de public yapılabilir; şu an login gerektiriyor
router.post("/set", authenticate, validateSet, setReaction);

// Rating (puanlama) – şimdilik login gerektiriyor
router.post("/rate", authenticate, validateRate, rate);

// Özetler
router.get("/ratings/summary", validateRatingSummaryQuery, getRatingSummary);
router.get("/summary", validateSummaryQuery, getSummary);

// Kullanıcının kendi reaksiyonları (login)
router.get("/me", authenticate, validateMyQuery, getMyReactions);

export default router;
