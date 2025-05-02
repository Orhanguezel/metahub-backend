import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import {Notification} from "@/modules/notification";

const getLocaleMessage = (locale: string | undefined, tr: string, en: string, de: string): string => {
  switch (locale) {
    case "tr":
      return tr;
    case "de":
      return de;
    default:
      return en;
  }
};

// 🔔 Yeni bildirim oluştur
export const createNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, message, type, user } = req.body;
    const locale = req.locale;

    const notification = await Notification.create({
      title,
      message,
      type,
      user: user || null,
    });

    res.status(201).json({
      success: true,
      message: getLocaleMessage(locale, "Bildirim başarıyla oluşturuldu.", "Notification created successfully.", "Benachrichtigung erfolgreich erstellt."),
      notification,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// 📋 Tüm bildirimleri getir
export const getAllNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await Notification.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// 🗑️ Bildirimi sil
export const deleteNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const locale = req.locale;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: getLocaleMessage(locale, "Geçersiz bildirim ID'si.", "Invalid notification ID.", "Ungültige Benachrichtigungs-ID.") });
      return;
    }

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      res.status(404).json({ message: getLocaleMessage(locale, "Bildirim bulunamadı.", "Notification not found.", "Benachrichtigung nicht gefunden.") });
      return;
    }

    res.status(200).json({
      success: true,
      message: getLocaleMessage(locale, "Bildirim başarıyla silindi.", "Notification deleted successfully.", "Benachrichtigung erfolgreich gelöscht."),
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Tek bildirimi okundu işaretle
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const locale = req.locale;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: getLocaleMessage(locale, "Geçersiz bildirim ID'si.", "Invalid notification ID.", "Ungültige Benachrichtigungs-ID.") });
      return;
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({ message: getLocaleMessage(locale, "Bildirim bulunamadı.", "Notification not found.", "Benachrichtigung nicht gefunden.") });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: getLocaleMessage(locale, "Bildirim okundu olarak işaretlendi.", "Notification marked as read.", "Benachrichtigung als gelesen markiert."),
      notification,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Tüm bildirimleri okundu işaretle
export const markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });

    res.status(200).json({
      success: true,
      message: getLocaleMessage(req.locale, "Tüm bildirimler okundu olarak işaretlendi.", "All notifications have been marked as read.", "Alle Benachrichtigungen wurden als gelesen markiert."),
    });
    return;
  } catch (error) {
    next(error);
  }
});
