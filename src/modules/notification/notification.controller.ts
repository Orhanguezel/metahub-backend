import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";

// -- Helpers --
const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// 🔔 Bildirim oluştur
export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  let { title, message, type, user, data } = req.body;

  title = fillAllLocales(parseIfJson(title));
  message = fillAllLocales(parseIfJson(message));

  const notification = await Notification.create({
    title,
    message,
    type,
    tenant: req.tenant,
    user: user || null,
    data: data || null,
  });

  res.status(201).json({
    success: true,
    message: t("notificationCreated", "Notification created successfully."),
    notification,
  });
  return;
});

// 📋 Tüm bildirimleri getir
export const getAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const notifications = await Notification.find({ tenant: req.tenant })
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: t("notificationsFetched", "Notifications fetched successfully."),
    notifications,
  });
  return;
});

// 🗑️ Bildirimi sil
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidNotificationId") });
    return;
  }

  const result = await Notification.deleteOne({ _id: id, tenant: req.tenant });
  if (result.deletedCount === 0) {
    res.status(404).json({ success: false, message: t("notificationNotFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("notificationDeleted", "Notification deleted."),
  });
  return;
});

// ✅ Tek bildirimi okundu işaretle
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidNotificationId") });
    return;
  }

  const notification = await Notification.findOne({ _id: id, tenant: req.tenant });
  if (!notification) {
    res.status(404).json({ success: false, message: t("notificationNotFound") });
    return;
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: t("notificationMarkedAsRead", "Notification marked as read."),
    notification,
  });
  return;
});

// ✅ Tüm bildirimleri okundu işaretle
export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { Notification } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  await Notification.updateMany(
    { tenant: req.tenant, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: t("allNotificationsMarkedAsRead", "All notifications marked as read."),
  });
  return;
});
