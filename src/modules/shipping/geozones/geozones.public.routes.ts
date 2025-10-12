// src/modules/shipping/geozones/geozones.public.routes.ts

import express from "express";
import { query } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";
import { resolveZone } from "./geozones.public.controller";

const router = express.Router();
router.get(
  "/resolve",
  [
    query("country").optional().isString().isLength({ min: 2, max: 2 }),
    query("state").optional().isString(),
    query("city").optional().isString(),
    query("postal").optional().isString(),
    validateRequest,
  ],
  resolveZone
);

export default router;
