import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { SupportedLocale } from "@/types/common";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
// import { storageAdapterGetStream } from "@/core/middleware/file/storageAdapter";

export const publicGetFileMeta = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { FileObject } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await FileObject.findOne({ _id: id, tenant: req.tenant, isActive: true }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

/* Eğer dosyayı proxy ederek stream etmek isterseniz:
export const publicStream = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // storageAdapterGetStream(provider, path/publicId).pipe(res);
});
*/
