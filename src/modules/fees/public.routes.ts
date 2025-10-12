import express from "express";
import { publicListFees, publicGetFeeByCode } from "./public.controller";
import { validateFeeListQuery } from "./validation";
import { param } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

const CODE_RE = /^[a-z0-9_]+$/;

const router = express.Router();

router.get("/", validateFeeListQuery, publicListFees);

router.get(
  "/:code",
  param("code").matches(CODE_RE),
  validateRequest,
  publicGetFeeByCode
);

export default router;
