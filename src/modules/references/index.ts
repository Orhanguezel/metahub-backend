// src/modules/references/index.ts
import express from "express";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
import { References } from "./models";
import * as publicReferencesController from "./public.controller";
import * as adminReferencesController from "./admin.controller";
import * as ReferencesValidation from "./validation";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export {
  References,
  publicReferencesController,
  adminReferencesController,
  ReferencesValidation,
};
export default router;
