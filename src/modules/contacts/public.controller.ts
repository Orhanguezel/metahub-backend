import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// PUBLIC: list
export const getAllContactsPublic = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { Contact } = await getTenantModels(req);

  const { q, kind } = req.query;
  const filter: Record<string, any> = { tenant: req.tenant, isActive: true };
  if (typeof kind === "string" && ["person", "organization"].includes(kind)) {
    filter.kind = kind;
  }
  if (typeof q === "string" && q.trim()) {
    const regex = new RegExp(q.trim(), "i");
    filter.$or = [
      { firstName: regex }, { lastName: regex }, { legalName: regex }, { tradeName: regex },
    ];
  }

  // Güvenli alanlar: kişisel verileri minimize et
  const list = await Contact.find(filter)
    .select("kind firstName lastName legalName tradeName slug emails phones addresses")
    .lean();

  logger.withReq.info(req, t("log.listed"), {
    ...getRequestContext(req),
    event: "contacts.public_list",
    module: "contacts",
    resultCount: list.length,
  });

  res.status(200).json({ success: true, message: t("log.listed"), data: list });
});

// PUBLIC: by id
export const getContactByIdPublic = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { Contact } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("error.invalid_id") });
    return;
  }

  const doc = await Contact.findOne({ _id: id, tenant: req.tenant, isActive: true })
    .select("kind firstName lastName legalName tradeName slug emails phones addresses")
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  res.status(200).json({ success: true, message: t("log.fetched"), data: doc });
});

// PUBLIC: by slug
export const getContactBySlugPublic = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { Contact } = await getTenantModels(req);

  const doc = await Contact.findOne({ slug, tenant: req.tenant, isActive: true })
    .select("kind firstName lastName legalName tradeName slug emails phones addresses")
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("error.not_found") });
    return;
  }

  res.status(200).json({ success: true, message: t("log.fetched"), data: doc });
});
