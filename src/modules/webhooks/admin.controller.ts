import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/utils/validation";
import { publishEvent } from "./dispatcher.service";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

// random secret
const genSecret = () => crypto.randomBytes(24).toString("hex");

// Header normalizer: object -> [{key,value}]
const toHeaderArray = (h: any) =>
  Array.isArray(h)
    ? h
    : Object.entries(h || {}).map(([key, value]) => ({ key, value: String(value) }));

/* ----------- Endpoints ----------- */

export const createEndpoint = asyncHandler(async (req, res) => {
  const t = tByReq(req);
  const { WebhookEndpoint } = await getTenantModels(req);

  const payload = { ...(req.body || {}) };
  payload.tenant = req.tenant;
  payload.secret = payload.secret || genSecret();
  payload.events = Array.isArray(payload.events) && payload.events.length ? payload.events : ["*"];
  if (payload.headers) payload.headers = toHeaderArray(payload.headers);

  const doc = await WebhookEndpoint.create(payload);
  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
  res.status(201).json({ success: true, message: t("created"), data: doc });
  return;
});

export const updateEndpoint = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const { WebhookEndpoint } = await getTenantModels(req);
  const doc = await WebhookEndpoint.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = req.body || {};
  const updatable = [
    "name",
    "description",
    "targetUrl",
    "httpMethod",
    "isActive",
    "events",
    "headers",
    "verifySSL",
    "signing",
    "retry",
  ] as const;

  for (const k of updatable) {
    if (up[k] !== undefined) {
      if (k === "headers") (doc as any)[k] = toHeaderArray(up[k]);
      else (doc as any)[k] = up[k];
    }
  }

  if (up.rotateSecret) doc.secret = genSecret();

  await doc.save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res
    .status(200)
    .json({ success: true, message: t(up.rotateSecret ? "secretRotated" : "updated"), data: doc });
  return;
});

export const listEndpoints = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { WebhookEndpoint } = await getTenantModels(req);

  const { q, isActive, event, limit = "200" } = req.query as Record<string, string>;
  const filter: any = { tenant: req.tenant };
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (event) filter.events = event;
  if (q && q.trim()) {
    filter.$or = [
      { name: { $regex: q.trim(), $options: "i" } },
      { targetUrl: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const list = await WebhookEndpoint.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
  return;
});

export const getEndpointById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { WebhookEndpoint } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const doc = await WebhookEndpoint.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

export const deleteEndpoint = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { WebhookEndpoint } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const doc = await WebhookEndpoint.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});

/* ----------- Deliveries (logs) ----------- */

export const listDeliveries = asyncHandler(async (req, res) => {
  const t = tByReq(req);
  const { WebhookDelivery } = await getTenantModels(req);
  const { endpointRef, eventType, success, from, to, limit = "200" } =
    req.query as Record<string, string>;

  const filter: any = { tenant: req.tenant };
  if (endpointRef && isValidObjectId(endpointRef)) filter.endpointRef = endpointRef;
  if (eventType) filter.eventType = eventType;
  if (typeof success === "string") filter.success = success === "true";

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const list = await WebhookDelivery.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
  return;
});

export const getDeliveryById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { WebhookDelivery } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }
  const doc = await WebhookDelivery.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});

export const retryDelivery = asyncHandler(async (req, res) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { WebhookDelivery, WebhookEndpoint } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidObjectId") });
    return;
  }

  const del = await WebhookDelivery.findOne({ _id: id, tenant: req.tenant });
  if (!del) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const ep = await WebhookEndpoint.findOne({
    _id: del.endpointRef,
    tenant: req.tenant,
    isActive: true,
  }).lean();
  if (!ep) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const deliveries = await publishEvent(
    WebhookEndpoint,
    WebhookDelivery,
    {
      tenant: req.tenant,
      eventType: del.eventType,
      payload: del.payload,
      onlyEndpointId: String(ep._id),
    },
    {
      nonBlocking: true,
      override: { maxAttempts: 1, timeoutMs: 2000, baseBackoffSec: 1 },
    }
  );

  const newId = deliveries[0]?._id;
  res.status(202).json({
    success: true,
    message: t("deliveryRetried"),
    data: newId ? { deliveryId: newId } : undefined,
  });
  return;
});

/* ----------- Test Send ----------- */

export const sendTestEvent = asyncHandler(async (req, res) => {
  const t = tByReq(req);
  const { endpointRef, targetUrl, eventType = "system.ping" } = req.body || {};
  const { WebhookEndpoint, WebhookDelivery } = await getTenantModels(req);

  let deliveries: any[] = [];
  if (endpointRef) {
    deliveries = await publishEvent(
      WebhookEndpoint,
      WebhookDelivery,
      {
        tenant: req.tenant,
        eventType,
        payload: { ping: true, ts: Date.now() },
        onlyEndpointId: endpointRef,
      },
      {
        nonBlocking: true,
        override: { maxAttempts: 1, timeoutMs: 2000, baseBackoffSec: 1 },
      }
    );
  } else {
    // geçici endpoint ile tek seferlik gönderim
    const tmp = await WebhookEndpoint.create({
      tenant: req.tenant,
      name: "tmp-test",
      targetUrl,
      httpMethod: "POST",
      isActive: true,
      events: ["*"],
      secret: genSecret(),
    });
    deliveries = await publishEvent(
      WebhookEndpoint,
      WebhookDelivery,
      {
        tenant: req.tenant,
        eventType,
        payload: { ping: true, ts: Date.now() },
        onlyEndpointId: String(tmp._id),
      },
      {
        nonBlocking: true,
        override: { maxAttempts: 1, timeoutMs: 2000, baseBackoffSec: 1 },
      }
    );
    await tmp.deleteOne();
  }

  res.status(202).json({
    success: true,
    message: t("testSent"),
    data: deliveries[0]?._id ? { deliveryId: deliveries[0]._id } : undefined,
  });
  return;
});
