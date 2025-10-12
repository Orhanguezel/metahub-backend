// modules/notifications/notification.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const toBool = (v: any) => (typeof v === "string" ? v === "true" : !!v);
const toInt = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// Projedeki tip: { id: string; _id?: string; role: "superadmin" | "admin" | ... }
const getUserId = (req: Request) => {
  const u = req.user as any;
  return (u?._id?.toString?.() || u?.id || "").toString();
};
const isAdminUser = (req: Request) => {
  const role = (req.user as any)?.role as ("superadmin" | "admin" | "user" | "customer" | "moderator" | "staff" | undefined);
  return role === "admin" || role === "superadmin";
};

// 🔔 Create (supports: target, channels, schedule, expire, dedupe)
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  let {
    title, message, type = "info", user, data,
    target, link, actions, channels,
    priority, scheduleAt, notBefore, expireAt,
    dedupeKey, dedupeWindowMin, source, tags, isActive
  } = req.body;

  title = fillAllLocales(parseIfJson(title));
  message = fillAllLocales(parseIfJson(message));

  // Dedupe guard
  if (dedupeKey && toInt(dedupeWindowMin, 0) > 0) {
    const since = new Date(Date.now() - toInt(dedupeWindowMin) * 60_000);
    const existing = await Notification.findOne({
      tenant: (req as any).tenant, dedupeKey, createdAt: { $gte: since }
    }).sort({ createdAt: -1 });

    if (existing) {
      res.status(200).json({
        success: true,
        duplicated: true,
        message: t("notificationDeduped", "Duplicate notification suppressed by dedupe window."),
        notification: existing,
      });
      return;
    }
  }

  const notification = await Notification.create({
    tenant: (req as any).tenant,
    user: user || null,
    target: parseIfJson(target) || undefined,
    type,
    title,
    message,
    data: data ?? null,
    link: parseIfJson(link) || undefined,
    actions: parseIfJson(actions) || [],
    channels: Array.isArray(channels) && channels.length ? channels : undefined,
    priority: priority ?? 3,
    scheduleAt: scheduleAt ? new Date(scheduleAt) : undefined,
    notBefore: notBefore ? new Date(notBefore) : undefined,
    expireAt: expireAt ? new Date(expireAt) : undefined,
    dedupeKey: dedupeKey || undefined,
    dedupeWindowMin: toInt(dedupeWindowMin, 0) || undefined,
    source: parseIfJson(source) || undefined,
    tags: parseIfJson(tags) || undefined,
    isActive: typeof isActive === "boolean" ? isActive : true,
  });

  res.status(201).json({
    success: true,
    message: t("notificationCreated", "Notification created successfully."),
    notification,
  });
  return;
});

// 📋 Admin list (filters + pagination)
export const getAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const {
    page = "1", limit = "20", type, isRead, user, channel, tag,
    active, q, from, to, sort = "-createdAt"
  } = req.query as Record<string, string>;

  const filter: any = { tenant: (req as any).tenant };
  if (type) filter.type = type;
  if (typeof isRead !== "undefined") filter.isRead = toBool(isRead);
  if (user && isValidObjectId(user)) filter.user = user;
  if (channel) filter.channels = channel;
  if (tag) filter.tags = tag;
  if (typeof active !== "undefined") filter.isActive = toBool(active);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (q) {
    const regex = new RegExp(q, "i");
    filter.$or = [
      { [`title.${locale}`]: regex },
      { [`message.${locale}`]: regex },
    ];
  }

  const p = Math.max(1, toInt(page, 1));
  const l = Math.min(200, Math.max(1, toInt(limit, 20)));
  const [items, total] = await Promise.all([
    Notification.find(filter).populate("user", "name email").sort(sort).skip((p - 1) * l).limit(l),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: t("notificationsFetched", "Notifications fetched successfully."),
    page: p, limit: l, total, items,
  });
  return;
});

// 👤 Current user's feed (tenant-scoped)
export const getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const { page = "1", limit = "20", isRead, q } = req.query as Record<string, string>;
  const me = getUserId(req);

  const filter: any = {
    tenant: (req as any).tenant,
    $or: [{ user: me }, { "target.users": me }, { "target.allTenant": true }],
  };
  if (typeof isRead !== "undefined") filter.isRead = toBool(isRead);
  if (q) {
    const regex = new RegExp(q, "i");
    filter.$and = [{ $or: [{ [`title.${locale}`]: regex }, { [`message.${locale}`]: regex }] }];
  }

  const p = Math.max(1, toInt(page, 1));
  const l = Math.min(200, Math.max(1, toInt(limit, 20)));
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: t("notificationsFetched", "Notifications fetched successfully."),
    page: p, limit: l, total, items,
  });
  return;
});

// 🔢 unread count (admin: any user / user: self)
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const queryUser = (req.query.user as string) || "";
  const me = getUserId(req);
  const userId = queryUser || me;

  const filter: any = { tenant: (req as any).tenant, isRead: false };
  if (userId && isValidObjectId(userId)) {
    filter.$or = [{ user: userId }, { "target.users": userId }, { "target.allTenant": true }];
  }

  const count = await Notification.countDocuments(filter);
  res.status(200).json({ success: true, count });
  return;
});

// 🗑️ Delete (admin)
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidNotificationId") });
    return;
  }

  const result = await Notification.deleteOne({ _id: id, tenant: (req as any).tenant });
  if (result.deletedCount === 0) {
    res.status(404).json({ success: false, message: t("notificationNotFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("notificationDeleted", "Notification deleted.") });
  return;
});

// ✅ Mark one as read (owner or admin)
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidNotificationId") });
    return;
  }

  const n = await Notification.findOne({ _id: id, tenant: (req as any).tenant });
  if (!n) {
    res.status(404).json({ success: false, message: t("notificationNotFound") });
    return;
  }

  const admin = isAdminUser(req);
  const me = getUserId(req);
  const owned =
    (n.user && n.user.toString() === me) ||
    (n as any).target?.users?.some?.((u: any) => u?.toString?.() === me) ||
    (n as any).target?.allTenant === true;

  if (!admin && !owned) {
    res.status(403).json({ success: false, message: t("forbidden", "Forbidden") });
    return;
  }

  if (!n.isRead) {
    n.isRead = true;
    (n as any).readAt = new Date();
    await n.save();
  }

  res.status(200).json({
    success: true,
    message: t("notificationMarkedAsRead", "Notification marked as read."),
    notification: n,
  });
  return;
});

// ✅ Mark all as read (tenant-wide by admin) or only mine
export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const onlyMine = toBool((req.query as any).onlyMine);
  const me = getUserId(req);

  const admin = isAdminUser(req);
  if (!admin && !onlyMine) {
    res.status(403).json({ success: false, message: t("forbidden", "Forbidden") });
    return;
  }

  const filter: any = { tenant: (req as any).tenant, isRead: false };
  if (onlyMine) {
    filter.$or = [{ user: me }, { "target.users": me }, { "target.allTenant": true }];
  }

  const result = await Notification.updateMany(
    filter,
    { $set: { isRead: true, readAt: new Date() } }
  );

  res.status(200).json({
    success: true,
    message: t("allNotificationsMarkedAsRead", "All notifications marked as read."),
    modified: result.modifiedCount,
  });
  return;
});
