import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/** CREATE */
export const createContract = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Contract, Apartment, Customer, ServiceCatalog } = await getTenantModels(req);

  const payload = req.body || {};
  payload.tenant = req.tenant;

  // parties.apartment zorunlu ve tenant'a ait mi
  if (!payload?.parties?.apartment || !isValidObjectId(payload.parties.apartment)) {
    res.status(400).json({ success: false, message: t("validation.apartmentRequired") });
    return;
  }
  const ap = await Apartment.findOne({ _id: payload.parties.apartment, tenant: req.tenant })
    .select("_id")
    .lean();
  if (!ap) {
    res.status(404).json({ success: false, message: t("validation.apartmentNotFound") });
    return;
  }

  // opsiyonel customer kontrolü
  if (payload?.parties?.customer && isValidObjectId(payload.parties.customer)) {
    const cust = await Customer.findOne({ _id: payload.parties.customer, tenant: req.tenant })
      .select("_id")
      .lean();
    if (!cust) {
      res.status(404).json({ success: false, message: t("validation.customerNotFound") });
      return;
    }
  }

  // lines.service referansları (varsa)
  if (Array.isArray(payload.lines) && payload.lines.length) {
    const svcIds = payload.lines
      .map((l: any) => l?.service)
      .filter((id: any) => isValidObjectId(id));
    if (svcIds.length) {
      const cnt = await ServiceCatalog.countDocuments({ _id: { $in: svcIds }, tenant: req.tenant });
      if (cnt !== svcIds.length) {
        res.status(400).json({ success: false, message: t("validation.serviceNotFound") });
        return;
      }
    }
  }

  const doc = await Contract.create(payload);

  logger.withReq.info(req, t("created"), {
    ...getRequestContext(req),
    id: doc._id,
    code: doc.code,
    status: doc.status,
  });
  res.status(201).json({ success: true, message: t("created"), data: doc });
});

/** UPDATE (PUT) */
export const updateContract = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Contract, Apartment, Customer, ServiceCatalog } = await getTenantModels(req);
  const doc = await Contract.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = req.body || {};
  const updatable = [
    "title",
    "description",
    "parties",
    "lines",
    "billing",
    "status",
    "activatedAt",
    "terminatedAt",
    "reasonNote",
    "isActive",
    "code",
  ];
  for (const k of updatable) if (up[k] !== undefined) doc.set(k, up[k]);

  // değişen referanslar için hafif doğrulama
  if (up?.parties?.apartment && isValidObjectId(up.parties.apartment)) {
    const ap = await Apartment.findOne({ _id: up.parties.apartment, tenant: req.tenant })
      .select("_id")
      .lean();
    if (!ap) {
      res.status(404).json({ success: false, message: t("validation.apartmentNotFound") });
      return;
    }
  }
  if (up?.parties?.customer && isValidObjectId(up.parties.customer)) {
    const cust = await Customer.findOne({ _id: up.parties.customer, tenant: req.tenant })
      .select("_id")
      .lean();
    if (!cust) {
      res.status(404).json({ success: false, message: t("validation.customerNotFound") });
      return;
    }
  }
  if (Array.isArray(up?.lines) && up.lines.length) {
    const svcIds = up.lines.map((l: any) => l?.service).filter((id: any) => isValidObjectId(id));
    if (svcIds.length) {
      const cnt = await ServiceCatalog.countDocuments({ _id: { $in: svcIds }, tenant: req.tenant });
      if (cnt !== svcIds.length) {
        res.status(400).json({ success: false, message: t("validation.serviceNotFound") });
        return;
      }
    }
  }

  await doc.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

/** PATCH status */
export const changeContractStatus = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { status } = req.body as {
    status: "draft" | "active" | "suspended" | "terminated" | "expired";
  };

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Contract } = await getTenantModels(req);
  const doc = await Contract.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  doc.status = status;
  await doc.save();

  logger.withReq.info(req, t("statusChanged"), { ...getRequestContext(req), id, status });
  res.status(200).json({ success: true, message: t("statusChanged"), data: doc });
});

/** LIST (admin) */
export const adminGetContracts = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Contract } = await getTenantModels(req);

  const {
    status,
    apartment,
    customer,
    period,
    startFrom,
    startTo,
    q,
    isActive,
    limit = "200",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (status) filter.status = status;
  if (apartment && isValidObjectId(apartment)) filter["parties.apartment"] = apartment;
  if (customer && isValidObjectId(customer)) filter["parties.customer"] = customer;
  if (period) filter["billing.period"] = period;
  if (typeof isActive === "string") filter.isActive = isActive === "true";

  if (startFrom || startTo) {
    filter["billing.startDate"] = {};
    if (startFrom) filter["billing.startDate"].$gte = new Date(startFrom);
    if (startTo) filter["billing.startDate"].$lte = new Date(startTo);
  }

  if (q && q.trim()) {
    const regex = { $regex: q.trim(), $options: "i" };
    filter.$or = [
      { code: regex },
      { "title.en": regex },
      { "title.tr": regex },
      { "title.de": regex },
      { "description.en": regex },
      { "description.tr": regex },
    ];
  }

  const list = await Contract.find(filter)
    .populate([
      { path: "parties.apartment", select: "title slug" },
      { path: "parties.customer", select: "companyName contactName" },
      { path: "lines.service", select: "name code" },
    ])
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/** GET BY ID (admin) */
export const adminGetContractById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Contract } = await getTenantModels(req);
  const doc = await Contract.findOne({ _id: id, tenant: req.tenant })
    .populate([
      { path: "parties.apartment", select: "title slug address" },
      { path: "parties.customer", select: "companyName contactName email phone" },
      { path: "lines.service", select: "name code defaultDurationMin defaultTeamSize" },
    ])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

/** DELETE */
export const deleteContract = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { Contract } = await getTenantModels(req);
  const doc = await Contract.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
