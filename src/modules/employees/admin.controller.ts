import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SupportedLocale } from "@/types/common";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/utils/validation";

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };

// CREATE
export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Employee } = await getTenantModels(req);
  const t = (k: string, p?: any) => translate(k, locale, translations, p);

  const payload = {
    tenant: req.tenant,
    code: req.body.code,
    userRef: isValidObjectId(req.body.userRef) ? req.body.userRef : undefined,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    fullName: req.body.fullName,
    displayName: req.body.displayName,
    photoUrl: req.body.photoUrl,

    contact: req.body.contact,
    emergency: req.body.emergency,

    languages: Array.isArray(req.body.languages) ? req.body.languages : [],
    skills: Array.isArray(req.body.skills) ? req.body.skills : [],
    certifications: Array.isArray(req.body.certifications) ? req.body.certifications : [],

    employment: req.body.employment,

    homeBase: req.body.homeBase,
    timezone: req.body.timezone,

    weeklyAvailability: Array.isArray(req.body.weeklyAvailability) ? req.body.weeklyAvailability : [],
    specialDays: Array.isArray(req.body.specialDays) ? req.body.specialDays : [],
    leaves: Array.isArray(req.body.leaves) ? req.body.leaves : [],
    constraints: req.body.constraints,

    rateCards: Array.isArray(req.body.rateCards) ? req.body.rateCards : [],
    currentCostPerHour: req.body.currentCostPerHour,
    currentBillPerHour: req.body.currentBillPerHour,

    status: req.body.status || "active",
    notes: req.body.notes,
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
  };

  const doc = await Employee.create(payload);

  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
  res.status(201).json({ success: true, message: t("created"), data: doc });
});

// UPDATE
export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Employee } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { id } = req.params;
  const doc = isValidObjectId(id) ? await Employee.findOne({ _id: id, tenant: req.tenant }) : null;

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
  } else {
    const b = req.body;

    if (b.code !== undefined) doc.code = b.code;
    if (isValidObjectId(b.userRef)) doc.userRef = b.userRef;

    if (b.firstName !== undefined) doc.firstName = b.firstName;
    if (b.lastName !== undefined) doc.lastName = b.lastName;
    if (b.fullName !== undefined) doc.fullName = b.fullName;
    if (b.displayName !== undefined) doc.displayName = b.displayName;
    if (b.photoUrl !== undefined) doc.photoUrl = b.photoUrl;

    if (b.contact !== undefined) doc.contact = parseIfJson(b.contact);
    if (b.emergency !== undefined) doc.emergency = parseIfJson(b.emergency);

    if (b.languages !== undefined) doc.languages = Array.isArray(b.languages) ? b.languages : parseIfJson(b.languages);
    if (b.skills !== undefined) doc.skills = Array.isArray(b.skills) ? b.skills : parseIfJson(b.skills);
    if (b.certifications !== undefined) doc.certifications = Array.isArray(b.certifications) ? b.certifications : parseIfJson(b.certifications);

    if (b.employment !== undefined) doc.employment = parseIfJson(b.employment);

    if (b.homeBase !== undefined) doc.homeBase = parseIfJson(b.homeBase);
    if (b.timezone !== undefined) doc.timezone = b.timezone;

    if (b.weeklyAvailability !== undefined) doc.weeklyAvailability = Array.isArray(b.weeklyAvailability) ? b.weeklyAvailability : parseIfJson(b.weeklyAvailability);
    if (b.specialDays !== undefined) doc.specialDays = Array.isArray(b.specialDays) ? b.specialDays : parseIfJson(b.specialDays);
    if (b.leaves !== undefined) doc.leaves = Array.isArray(b.leaves) ? b.leaves : parseIfJson(b.leaves);
    if (b.constraints !== undefined) doc.constraints = parseIfJson(b.constraints);

    if (b.rateCards !== undefined) doc.rateCards = Array.isArray(b.rateCards) ? b.rateCards : parseIfJson(b.rateCards);
    if (b.currentCostPerHour !== undefined) doc.currentCostPerHour = Number(b.currentCostPerHour);
    if (b.currentBillPerHour !== undefined) doc.currentBillPerHour = Number(b.currentBillPerHour);

    if (b.status !== undefined) doc.status = b.status;
    if (b.notes !== undefined) doc.notes = parseIfJson(b.notes);
    if (b.tags !== undefined) doc.tags = Array.isArray(b.tags) ? b.tags : parseIfJson(b.tags);

    await doc.save();
    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: doc });
  }
});

// LIST (admin)
export const adminGetAllEmployee = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Employee } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);

  const { q, status, language, skill, serviceRef, tag, limit = "200" } = req.query;

  const filter: Record<string, any> = { tenant: req.tenant };
  if (typeof status === "string") filter.status = status;
  if (typeof language === "string") filter["languages.code"] = language;
  if (typeof skill === "string") filter["skills.key"] = skill;
  if (typeof tag === "string") filter.tags = tag;
  if (typeof serviceRef === "string" && isValidObjectId(serviceRef)) {
    filter.$or = [
      { "skills.serviceRef": serviceRef },
      { "rateCards.serviceRef": serviceRef },
    ];
  }
  if (typeof q === "string" && q.trim()) {
    const rx = { $regex: q.trim(), $options: "i" };
    filter.$or = [
      ...(filter.$or || []),
      { code: rx },
      { firstName: rx },
      { lastName: rx },
      { fullName: rx },
      { displayName: rx },
    ];
  }

  const list = await Employee.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// GET BY ID (admin)
export const adminGetEmployeeById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Employee } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  const doc = isValidObjectId(id) ? await Employee.findOne({ _id: id, tenant: req.tenant }).lean() : null;

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
  } else {
    res.status(200).json({ success: true, message: t("fetched"), data: doc });
  }
});

// DELETE (admin)
export const deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Employee } = await getTenantModels(req);
  const t = (k: string) => translate(k, locale, translations);
  const { id } = req.params;

  const doc = isValidObjectId(id) ? await Employee.findOne({ _id: id, tenant: req.tenant }) : null;

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
  } else {
    await doc.deleteOne();
    logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("deleted") });
  }
});
