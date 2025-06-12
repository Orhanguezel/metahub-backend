import express from "express";
import sectionRoutes from "./section.routes";
import { Section } from "./section.models";
import * as sectionController from "./section.controller";
import * as sectionValidation from "./section.validation";
import type { ISection } from "./types";

const router = express.Router();
router.use("/", sectionRoutes);

export {
  Section,
  sectionController,
  sectionValidation,
  ISection,
  router as sectionRouter,
};

export default router;
