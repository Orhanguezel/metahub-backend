import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import type { IContact } from "./types";

const parseIfJson = (v: any) => {
  try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; }
};

// CREATE
export const createContact = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { Contact } = await getTenantModels(req);

  try {
    const body = req.body || {};
    const doc: Partial<IContact> = {
      tenant: req.tenant,
      kind: body.kind,
      firstName: body.firstName,
      lastName: body.lastName,
      legalName: body.legalName,
      tradeName: body.tradeName,
      slug: body.slug, // model pre-validate slugify ediyor
      emails: parseIfJson(body.emails) || [],
      phones: parseIfJson(body.phones) || [],
      addresses: parseIfJson(body.addresses) || [],
      billing: parseIfJson(body.billing) || undefined,
      notes: body.notes,
      isActive: body.isActive === "false" ? false : true,
    };

    const created = await Contact.create(doc);
    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: created._id });
    res.status(201).json({ success: true, message: t("created"), data: created });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "contacts.create",
      module: "contacts",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { Contact } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Contact.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  try {
    const b = req.body || {};
    if (b.kind) doc.kind = b.kind;
    if (b.firstName !== undefined) doc.firstName = b.firstName;
    if (b.lastName !== undefined) doc.lastName = b.lastName;
    if (b.legalName !== undefined) doc.legalName = b.legalName;
    if (b.tradeName !== undefined) doc.tradeName = b.tradeName;
    if (b.slug !== undefined) doc.slug = b.slug;

    if (b.emails !== undefined) doc.emails = parseIfJson(b.emails) || [];
    if (b.phones !== undefined) doc.phones = parseIfJson(b.phones) || [];
    if (b.addresses !== undefined) doc.addresses = parseIfJson(b.addresses) || [];
    if (b.billing !== undefined) doc.billing = parseIfJson(b.billing) || undefined;

    if (b.notes !== undefined) doc.notes = b.notes;
    if (b.isActive !== undefined) doc.isActive = b.isActive === "true" || b.isActive === true;

    await doc.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ success: false, message: t("error.duplicate") });
      return;
    }
    logger.withReq.error(req, t("error.update_fail"), {
      ...getRequestContext(req),
      event: "contacts.update",
      module: "contacts",
      status: "fail",
      error: err?.message,
    });
    res.status(500).json({ success: false, message: t("error.update_fail") });
  }
});

// GET ALL (Admin)
export const adminGetAllContacts = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string, p?: any) => translate(k, locale, translations, p);
  const { Contact } = await getTenantModels(req);

  const { q, kind, isActive } = req.query;
  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof kind === "string" && ["person", "organization"].includes(kind)) {
    filter.kind = kind;
  }
  if (typeof isActive === "string") {
    filter.isActive = isActive === "true";
  }
  if (typeof q === "string" && q.trim()) {
    const regex = new RegExp(q.trim(), "i");
    filter.$or = [
      { firstName: regex }, { lastName: regex },
      { legalName: regex }, { tradeName: regex },
      { "emails.value": regex }, { "phones.value": regex },
    ];
  }

  const list = await Contact.find(filter).sort({ createdAt: -1 }).lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// GET BY ID (Admin)
export const adminGetContactById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { Contact } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Contact.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// DELETE (Admin)
export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (k: string) => translate(k, locale, translations);
  const { Contact } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Contact.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
