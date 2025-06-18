export const getControllerContent = (CapName: string, moduleName: string) => `
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { t, getLogLocale } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

// ➕ Create
export const create${CapName} = asyncHandler(async (req: Request, res: Response) => {
  const { ${CapName} } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  try {
    // --- Kendi create işlemin burada ---
    logger.info(
      t("create.success", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.create", status: "success" }
    );
    res.status(201).json({ success: true });
  } catch (error) {
    logger.error(
      t("create.fail", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.create", status: "fail", error }
    );
    res.status(500).json({ success: false, error });
  }
});

// 📝 Get All
export const getAll${CapName} = asyncHandler(async (req: Request, res: Response) => {
  const { ${CapName} } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  try {
    // --- Kendi get all işlemin burada ---
    logger.info(
      t("list.success", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.list", status: "success" }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(
      t("list.fail", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.list", status: "fail", error }
    );
    res.status(500).json({ success: false, error });
  }
});

// ✏️ Update
export const update${CapName} = asyncHandler(async (req: Request, res: Response) => {
  const { ${CapName} } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  try {
    // --- Kendi update işlemin burada ---
    logger.info(
      t("update.success", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.update", status: "success" }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(
      t("update.fail", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.update", status: "fail", error }
    );
    res.status(500).json({ success: false, error });
  }
});

// 🗑️ Delete
export const delete${CapName} = asyncHandler(async (req: Request, res: Response) => {
  const { ${CapName} } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  try {
    // --- Kendi delete işlemin burada ---
    logger.info(
      t("delete.success", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.delete", status: "success" }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error(
      t("delete.fail", locale, translations),
      { ...getRequestContext(req), module: "${moduleName}", event: "${moduleName}.delete", status: "fail", error }
    );
    res.status(500).json({ success: false, error });
  }
});
`;
