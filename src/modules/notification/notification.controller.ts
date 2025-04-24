import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Notification from "./notification.models";

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
export const createNotification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { title, message, type, user } = req.body;
    const locale = req.locale;

    if (!title || !message || !type) {
      res.status(400).json({
        message: getLocaleMessage(
          locale,
          "Başlık, mesaj ve tür zorunludur.",
          "Title, message and type are required.",
          "Titel, Nachricht und Typ sind erforderlich."
        ),
      });
      return;
    }

    const notification = await Notification.create({
      title,
      message,
      type,
      user: user || null,
    });

    res.status(201).json({
      message: getLocaleMessage(
        locale,
        "Bildirim başarıyla oluşturuldu.",
        "Notification created successfully.",
        "Benachrichtigung erfolgreich erstellt."
      ),
      notification,
    });
    return;
  }
);

// 📋 Tüm bildirimleri getir (admin)
export const getAllNotifications = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const notifications = await Notification.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
    return;
  }
);

// 🗑️ Bildirimi sil
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const locale = req.locale;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        message: getLocaleMessage(
          locale,
          "Geçersiz bildirim ID'si.",
          "Invalid notification ID.",
          "Ungültige Benachrichtigungs-ID."
        ),
      });
      return;
    }

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      res.status(404).json({
        message: getLocaleMessage(
          locale,
          "Bildirim bulunamadı.",
          "Notification not found.",
          "Benachrichtigung nicht gefunden."
        ),
      });
      return;
    }

    res.status(200).json({
      message: getLocaleMessage(
        locale,
        "Bildirim başarıyla silindi.",
        "Notification deleted successfully.",
        "Benachrichtigung erfolgreich gelöscht."
      ),
    });
    return;
  }
);

// ✅ Tek bildirimi okundu olarak işaretle
export const markNotificationAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const locale = req.locale;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        message: getLocaleMessage(
          locale,
          "Geçersiz bildirim ID'si.",
          "Invalid notification ID.",
          "Ungültige Benachrichtigungs-ID."
        ),
      });
      return;
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({
        message: getLocaleMessage(
          locale,
          "Bildirim bulunamadı.",
          "Notification not found.",
          "Benachrichtigung nicht gefunden."
        ),
      });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      message: getLocaleMessage(
        locale,
        "Bildirim okundu olarak işaretlendi.",
        "Notification marked as read.",
        "Benachrichtigung als gelesen markiert."
      ),
      notification,
    });
    return;
  }
);

// ✅ Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const locale = req.locale;

    await Notification.updateMany({ isRead: false }, { isRead: true });

    res.status(200).json({
      message: getLocaleMessage(
        locale,
        "Tüm bildirimler okundu olarak işaretlendi.",
        "All notifications have been marked as read.",
        "Alle Benachrichtigungen wurden als gelesen markiert."
      ),
    });
    return;
  }
);
