import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { sendEmail } from "@/services/emailService";
import logger from "@/core/middleware/logger/logger";
import { SUPPORTED_LOCALES } from "@/types/common";
import { newsletterTemplate } from "./templates/newsletterTemplate"; 

// ✅ Public: Subscribe to newsletter (double opt-in ready)
export const subscribeNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { email, lang, meta } = req.body;
      const tenantData = req.tenantData;
      const brandName = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
      const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";
      const brandWebsite = tenantData?.domain?.main ? `https://${tenantData.domain.main}` : process.env.BRAND_WEBSITE;

      if (!email) {
        res.status(400).json({
          success: false,
          message: t("emailRequired"),
        });
        return;
      }

      const { Newsletter, Notification } = await getTenantModels(req);

      // Zaten abone mi?
      const exists = await Newsletter.findOne({
        tenant: req.tenant,
        email: email.toLowerCase().trim(),
      });
      if (exists && exists.verified) {
        res.status(200).json({
          success: true,
          message: t("alreadySubscribed"),
        });
        return;
      }

      // Yeni kayıt ya da henüz onaylanmamışsa
      const newsletter = exists
        ? await Newsletter.findOneAndUpdate(
            { _id: exists._id },
            { lang, meta },
            { new: true }
          )
        : await Newsletter.create({
            tenant: req.tenant,
            email: email.toLowerCase().trim(),
            verified: false,
            lang,
            meta,
            subscribeDate: new Date(),
          });

      // Double opt-in: Onay maili gönder (isteğe bağlı!)
      await sendEmail({
        to: email,
        subject: t("email.verifySubject", { brand: brandName }),
        html: t("email.verifyBody", { brand: brandName, brandWebsite }),
        tenantSlug: req.tenant,
        from: senderEmail,
      });

      // Admin'e notifikasyon (isteğe bağlı)
      for (const lng of SUPPORTED_LOCALES) {
        await Notification.create({
          tenant: req.tenant,
          type: "info",
          title: { [lng]: t("notification.newSubscriberTitle", { brand: brandName }) },
          message: { [lng]: t("notification.newSubscriberMsg", { email }) },
          isRead: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.status(201).json({
        success: true,
        message: t("subscriptionSuccess"),
        data: newsletter,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Public: Unsubscribe (çıkış)
export const unsubscribeNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { email } = req.body;
      const tenantData = req.tenantData;
      const brandName = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
      const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";

      if (!email) {
        res.status(400).json({
          success: false,
          message: t("emailRequired"),
        });
        return;
      }

      const { Newsletter, Notification } = await getTenantModels(req);

      const unsubscribed = await Newsletter.findOneAndUpdate(
        { tenant: req.tenant, email: email.toLowerCase().trim() },
        { unsubscribeDate: new Date() },
        { new: true }
      );

      if (!unsubscribed) {
        res.status(404).json({
          success: false,
          message: t("notFound"),
        });
        return;
      }

      // İsteğe bağlı: Kullanıcıya bildirim maili
      await sendEmail({
        to: email,
        subject: t("email.unsubscribeSubject", { brand: brandName }),
        html: t("email.unsubscribeBody", { brand: brandName }),
        tenantSlug: req.tenant,
        from: senderEmail,
      });

      // Admin'e notifikasyon
      for (const lng of SUPPORTED_LOCALES) {
        await Notification.create({
          tenant: req.tenant,
          type: "info",
          title: { [lng]: t("notification.unsubscribeTitle", { brand: brandName }) },
          message: { [lng]: t("notification.unsubscribeMsg", { email }) },
          isRead: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: t("unsubscribed"),
        data: unsubscribed,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: List all newsletter subscribers
export const getAllSubscribers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { Newsletter } = await getTenantModels(req);
      const subscribers = await Newsletter.find({ tenant: req.tenant }).sort({
        subscribeDate: -1,
      });

      res.status(200).json({
        success: true,
        message: t("fetched"),
        data: subscribers,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Delete single subscriber
export const deleteSubscriber = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { Newsletter, Notification } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: t("invalidId"),
        });
        return;
      }

      const sub = await Newsletter.findOne({ _id: id, tenant: req.tenant });
      if (!sub) {
        res.status(404).json({
          success: false,
          message: t("notFound"),
        });
        return;
      }

      await Newsletter.deleteOne({
        _id: id,
        tenant: req.tenant,
      });

      // Admin'e notifikasyon
      for (const lng of SUPPORTED_LOCALES) {
        await Notification.create({
          tenant: req.tenant,
          type: "warning",
          title: { [lng]: t("notification.deletedTitle") },
          message: { [lng]: t("notification.deletedMsg", { email: sub.email }) },
          isRead: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: t("deleted"),
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Mark subscriber as verified (manuel onay)
export const verifySubscriber = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { Newsletter, Notification } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: t("invalidId"),
        });
        return;
      }

      const updated = await Newsletter.findOneAndUpdate(
        { _id: id, tenant: req.tenant },
        { verified: true },
        { new: true }
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: t("notFound"),
        });
        return;
      }

      // Admin'e notifikasyon
      for (const lng of SUPPORTED_LOCALES) {
        await Notification.create({
          tenant: req.tenant,
          type: "success",
          title: { [lng]: t("notification.verifiedTitle") },
          message: { [lng]: t("notification.verifiedMsg", { email: updated.email }) },
          isRead: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: t("verified"),
        data: updated,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Toplu mesaj gönder
export const sendBulkNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { subject, html, filter } = req.body;
      const tenantData = req.tenantData;
      const brandName = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
      const brandWebsite = tenantData?.domain?.main ? `https://${tenantData.domain.main}` : process.env.BRAND_WEBSITE;
      const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";

      if (!subject || !html) {
        res.status(400).json({ success: false, message: t("bulk.requiredFields", "Konu ve içerik zorunlu!") });
        return;
      }

      const { Newsletter, Notification } = await getTenantModels(req);

      const query = {
        tenant: req.tenant,
        verified: true,
        unsubscribeDate: null,
        ...(filter || {}),
      };

      const subscribers = await Newsletter.find(query);
      if (!subscribers.length) {
        res.status(404).json({ success: false, message: t("bulk.noSubscribers", "Uygun abone bulunamadı.") });
        return;
      }

      let sentCount = 0;
      for (const sub of subscribers) {
        try {
          await sendEmail({
            to: sub.email,
            subject,
            html: newsletterTemplate({
              name: sub.email, // veya başka bir kişisel veri yoksa email kullan
              subject,
              message: html,   // burada gönderdiğin HTML doğrudan gömülür (ör: frontend html wysiwyg)
              brandName,
              brandWebsite,
              locale,
            }),
            tenantSlug: req.tenant,
            from: senderEmail,
          });
          sentCount++;
        } catch (mailErr) {
          logger.error(
            `[NEWSLETTER] Bulk mail failed for ${sub.email}: ${mailErr}`,
            { module: "newsletter", event: "bulk.mail.fail", error: mailErr }
          );
        }
      }

      for (const lng of SUPPORTED_LOCALES) {
        await Notification.create({
          tenant: req.tenant,
          type: "info",
          title: { [lng]: t("notification.bulkTitle", { brand: brandName }) },
          message: {
            [lng]: t("notification.bulkMsg", {
              count: sentCount,
              subject,
            }),
          },
          isRead: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: t("bulk.success", "Toplu e-posta gönderimi tamamlandı."),
        sent: sentCount,
        total: subscribers.length,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Tekil aboneye e-posta gönder
export const sendSingleNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const { id } = req.params;
      const { subject, html } = req.body;

      if (!isValidObjectId(id)) {
        res.status(400).json({ success: false, message: t("invalidId") });
        return;
      }
      if (!subject || !html) {
        res.status(400).json({ success: false, message: t("bulk.requiredFields", "Konu ve içerik zorunlu!") });
        return;
      }

      const { Newsletter } = await getTenantModels(req);
      const tenantData = req.tenantData;
      const brandName = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
      const brandWebsite = tenantData?.domain?.main ? `https://${tenantData.domain.main}` : process.env.BRAND_WEBSITE;
      const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";

      const subscriber = await Newsletter.findOne({ _id: id, tenant: req.tenant });
      if (!subscriber) {
        res.status(404).json({ success: false, message: t("notFound") });
        return;
      }

      await sendEmail({
        to: subscriber.email,
        subject,
        html: newsletterTemplate({
          name: subscriber.email,
          subject,
          message: html,
          brandName,
          brandWebsite,
          locale,
        }),
        tenantSlug: req.tenant,
        from: senderEmail,
      });

      res.status(200).json({
        success: true,
        message: t("single.success", "E-posta başarıyla gönderildi."),
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);
