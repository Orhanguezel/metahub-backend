import express from "express";;
import sectionmetaRoutes from "./sectionmeta.routes";
import sectionsettingRoutes from "./sectionsetting.routes";
import { SectionMeta } from "./section.models";
import { SectionSetting } from "./section.models";
import * as sectionmetaController from "./sectionmeta.controller";
import * as sectionsettingController from "./sectionsetting.controller";
import * as sectionValidation from "./section.validation";
import type { ISectionMeta, ISectionSetting } from "./types";

const router = express.Router();
router.use("/meta", sectionmetaRoutes);
router.use("/setting", sectionsettingRoutes);

export {
  SectionMeta,
  sectionmetaController,
  sectionsettingController,
  sectionValidation,
  ISectionMeta,
  ISectionSetting,
  SectionSetting,
  sectionmetaRoutes,
  sectionsettingRoutes,

};

export default router;
