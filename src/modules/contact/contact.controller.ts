import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { sendEmail } from "@/services/emailService";
import { ContactReplyTemplate } from "@/modules/contact/templates/contactReplyTemplate";

// ✅ Public: Send new contact message
export const sendMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        res.status(400).json({
          success: false,
          message: t("allFieldsRequired"),
        });
        return;
      }

      const { ContactMessage } = await getTenantModels(req);
      const newMessage = await ContactMessage.create({
        name,
        email,
        tenant: req.tenant,
        subject,
        message,
        isRead: false,
        isArchived: false,
      });

      // 🟢 Tenant marka adı (dil destekli)
      const tenantData = req.tenantData;
      const brandName =
        (tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand");
      const senderEmail = tenantData?.emailSettings?.senderEmail;

      // Kullanıcıya otomatik yanıt
      await sendEmail({
        to: email,
        subject: t("email.replySubject", { brand: brandName }),
        html: ContactReplyTemplate({
          name,
          subject,
          message,
          locale,
          brandName,
        }),
        from: senderEmail,
      });

      // Admin'e bilgilendirme
      if (process.env.ADMIN_EMAIL) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: `[Contact] Yeni İletişim Mesajı - ${brandName}`,
          html: `
            <h3>Yeni iletişim mesajı!</h3>
            <p><b>Ad:</b> ${name}</p>
            <p><b>E-Posta:</b> ${email}</p>
            <p><b>Konu:</b> ${subject}</p>
            <p><b>Mesaj:</b> <br/>${message}</p>
            <hr/>
            <small>Otomatik bilgilendirme.</small>
          `,
          from: senderEmail,
        });
      }

      res.status(201).json({
        success: true,
        message: t("messageSent"),
        data: newMessage,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Get all messages
export const getAllMessages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { ContactMessage } = await getTenantModels(req);
      const messages = await ContactMessage.find({ tenant: req.tenant }).sort({
        createdAt: -1,
      });
      res.status(200).json({
        success: true,
        message: t("messagesFetched"),
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Delete single message
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { ContactMessage } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: t("invalidMessageId"),
        });
        return;
      }

      const result = await ContactMessage.deleteOne({
        _id: id,
        tenant: req.tenant,
      });

      if (result.deletedCount === 0) {
        res.status(404).json({
          success: false,
          message: t("messageNotFound"),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: t("messageDeleted"),
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Mark message as read
export const markMessageAsRead = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { ContactMessage } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: t("invalidMessageId"),
        });
        return;
      }

      const updated = await ContactMessage.findOneAndUpdate(
        { _id: id, tenant: req.tenant },
        { isRead: true },
        { new: true }
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: t("messageNotFound"),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: t("messageMarkedRead"),
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);
