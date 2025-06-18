export const getIndexContent = (moduleName: string, CapName: string) => `
import express from "express";
import ${moduleName}Routes from "./${moduleName}.routes";
import ${CapName}, { I${CapName} } from "./${moduleName}.model";
import * as ${moduleName}Controller from "./${moduleName}.controller";
import * as ${moduleName}Validation from "./${moduleName}.validation";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

const router = express.Router();
router.use("/", ${moduleName}Routes);

export {
  ${CapName},
  I${CapName},
  ${moduleName}Controller,
  ${moduleName}Validation,
  translations
};

export default router;
`;
