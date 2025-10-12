import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { publishEvent } from "./dispatcher.service";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const genSecret = () => crypto.randomBytes(24).toString("hex");
const toHeaderArray = (h: any) =>
  Array.isArray(h) ? h : Object.entries(h || {}).map(([key, value]) => ({ key, value: String(value) }));

/* ---------- SSRF guard ---------- */
const PRIVATE_V4 = [
  { start: ipn("10.0.0.0"), end: ipn("10.255.255.255") },
  { start: ipn("172.16.0.0"), end: ipn("172.31.255.255") },
  { start: ipn("192.168.0.0"), end: ipn("192.168.255.255") },
  { start: ipn("169.254.0.0"), end: ipn("169.254.255.255") },
  { start: ipn("127.0.0.0"), end: ipn("127.255.255.255") },
];
function ipn(ip: string) { return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0; }
function isPrivateIPv4(ip: string) {
  const n = ipn(ip);
  return PRIVATE_V4.some(r => n >= r.start && n <= r.end);
}
function isBlockedIPv6(ip: string) {
  const s = ip.toLowerCase();
  return s.startsWith("::1") || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe80");
}
function isLocalHost(host: string) {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}
async function ensureSafeTargetUrl(urlStr: string) {
  let u: URL;
  try { u = new URL(urlStr); } catch { throw new Error("invalidUrl"); }
  if (!/^https?:$/i.test(u.protocol)) throw new Error("invalidUrl");
  if (isLocalHost(u.hostname)) throw new Error("targetUrl.blocked");

  if (net.isIP(u.hostname)) {
    if (net.isIPv4(u.hostname) && isPrivateIPv4(u.hostname)) throw new Error("targetUrl.blocked");
    if (net.isIPv6(u.hostname) && isBlockedIPv6(u.hostname)) throw new Error("targetUrl.blocked");
    return;
  }

  try {
    const records = await dns.lookup(u.hostname, { all: true });
    for (const r of records) {
      if ((r.family === 4 && isPrivateIPv4(r.address)) || (r.family === 6 && isBlockedIPv6(r.address))) {
        throw new Error("targetUrl.blocked");
      }
    }
  } catch { /* allow: transient DNS issues */ }
}

/* ---------- Endpoints ---------- */

export const createEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { WebhookEndpoint } = await getTenantModels(req);

  const payload = { ...(req.body || {}) };
  payload.tenant = req.tenant;
  payload.secret = payload.secret || genSecret();
  payload.events = Array.isArray(payload.events) && payload.events.length ? payload.events : ["*"];
  if (payload.headers) payload.headers = toHeaderArray(payload.headers);

  await ensureSafeTargetUrl(payload.targetUrl);

  const created = await WebhookEndpoint.create(payload);
  logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: created._id });

  const doc = await WebhookEndpoint.findById(created._id).lean();
  res.status(201).json({ success: true, message: t("created"), data: doc });
});

export const updateEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidObjectId") }); return; }

  const { WebhookEndpoint } = await getTenantModels(req);
  const doc = await WebhookEndpoint.findOne({ _id: id, tenant: req.tenant }).select("+secret");
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const up = req.body || {};
  const updatable = [
    "name","description","targetUrl","httpMethod","isActive","events","headers","verifySSL","signing","retry",
  ] as const;

  for (const k of updatable) {
    if (up[k] !== undefined) (doc as any)[k] = k === "headers" ? toHeaderArray(up[k]) : up[k];
  }
  if (up.targetUrl) await ensureSafeTargetUrl(up.targetUrl);
  if (up.rotateSecret) (doc as any).secret = genSecret();

  await (doc as any).save();
  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });

  const safeDoc = await WebhookEndpoint.findById(id).lean();
  res.status(200).json({ success: true, message: t(up.rotateSecret ? "secretRotated" : "updated"), data: safeDoc });
});

export const listEndpoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { WebhookEndpoint } = await getTenantModels(req);

  const { q, isActive, event, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: any = { tenant: req.tenant };
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (event) filter.events = event;
  if (q && q.trim()) {
    filter.$or = [
      { name: { $regex: q.trim(), $options: "i" } },
      { targetUrl: { $regex: q.trim(), $options: "i" } },
    ];
  }

  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const lm = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 500);

  const cursor = WebhookEndpoint.find(filter).sort({ createdAt: -1 }).skip((pg - 1) * lm).limit(lm).lean();
  const [list, total] = await Promise.all([cursor, WebhookEndpoint.countDocuments(filter)]);
  res.status(200).json({ success: true, message: t("listFetched"), data: list, meta: { page: pg, limit: lm, total } });
});

export const getEndpointById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  const { WebhookEndpoint } = await getTenantModels(req);
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidObjectId") }); return; }

  const doc = await WebhookEndpoint.findOne({ _id: id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

export const deleteEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  const { WebhookEndpoint } = await getTenantModels(req);
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidObjectId") }); return; }

  const doc = await WebhookEndpoint.findOne({ _id: id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  await (doc as any).deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ---------- Deliveries (logs) ---------- */

export const listDeliveries = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { WebhookDelivery } = await getTenantModels(req);
  const { endpointRef, eventType, success, from, to, includePayload = "false", page = "1", limit = "20" } =
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

  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const lm = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 500);

  const projection = includePayload === "true" ? undefined : "-payload";
  const cursor = WebhookDelivery.find(filter).select(projection).sort({ createdAt: -1 }).skip((pg - 1) * lm).limit(lm).lean();
  const [list, total] = await Promise.all([cursor, WebhookDelivery.countDocuments(filter)]);

  res.status(200).json({ success: true, message: t("listFetched"), data: list, meta: { page: pg, limit: lm, total } });
});

export const getDeliveryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  const { includePayload = "true" } = req.query as any;
  const { WebhookDelivery } = await getTenantModels(req);
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidObjectId") }); return; }

  const select = includePayload === "true" ? undefined : "-payload";
  const doc = await WebhookDelivery.findOne({ _id: id, tenant: req.tenant }).select(select).lean();
  if (!doc) { res.status(404).json({ success: false, message: t("notFound") }); return; }
  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

export const retryDelivery = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;
  const { WebhookDelivery, WebhookEndpoint } = await getTenantModels(req);
  if (!isValidObjectId(id)) { res.status(400).json({ success: false, message: t("invalidObjectId") }); return; }

  const del = await WebhookDelivery.findOne({ _id: id, tenant: req.tenant });
  if (!del) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const ep = await WebhookEndpoint.findOne({ _id: del.endpointRef, tenant: req.tenant, isActive: true }).lean();
  if (!ep) { res.status(404).json({ success: false, message: t("notFound") }); return; }

  const deliveries = await publishEvent(
    WebhookEndpoint,
    WebhookDelivery,
    { tenant: req.tenant, eventType: del.eventType, payload: del.payload, onlyEndpointId: String((ep as any)._id) },
    { nonBlocking: true, override: { maxAttempts: 1, timeoutMs: 2000, baseBackoffSec: 1 } }
  );

  const newId = (deliveries[0] as any)?._id;
  res.status(202).json({ success: true, message: t("deliveryRetried"), data: newId ? { deliveryId: newId } : undefined });
});

export const sendTestEvent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { endpointRef, targetUrl, eventType = "system.ping" } = req.body || {};
  const { WebhookEndpoint, WebhookDelivery } = await getTenantModels(req);

  let deliveries: any[] = [];
  if (endpointRef) {
    deliveries = await publishEvent(
      WebhookEndpoint,
      WebhookDelivery,
      { tenant: req.tenant, eventType, payload: { ping: true, ts: Date.now() }, onlyEndpointId: endpointRef },
      { nonBlocking: true, override: { maxAttempts: 1, timeoutMs: 2000, baseBackoffSec: 1 } }
    );
  } else {
    await ensureSafeTargetUrl(targetUrl);
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
      { tenant: req.tenant, eventType, payload: { ping: true, ts: Date.now() }, onlyEndpointId: String((tmp as any)._id) },
      { nonBlocking: true, override: { maxAttempts: 1, timeoutMs: 2000, baseBackoffSec: 1 } }
    );
    await tmp.deleteOne();
  }

  res.status(202).json({
    success: true,
    message: t("testSent"),
    data: (deliveries[0] as any)?._id ? { deliveryId: (deliveries[0] as any)._id } : undefined,
  });
});
