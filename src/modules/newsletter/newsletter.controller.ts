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
// ✅ Public: Subscribe (double opt-in ready) — v2 notifications
export const subscribeNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (k: string, p?: any) => translate(k, locale, translations, p);

    try {
      const { email, lang, meta } = req.body;
      const tenantData = req.tenantData;
      const brandName   = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
      const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";
      const brandWebsite = tenantData?.domain?.main ? `https://${tenantData.domain.main}` : process.env.BRAND_WEBSITE;

      if (!email) {
        res.status(400).json({ success: false, message: t("emailRequired") });
        return;
      }

      const { Newsletter, Notification } = await getTenantModels(req);
      const emailNorm = String(email).toLowerCase().trim();

      // zaten var mı?
      const exists = await Newsletter.findOne({ tenant: req.tenant, email: emailNorm });
      if (exists?.verified) {
        res.status(200).json({ success: true, message: t("alreadySubscribed") });
        return;
      }

      const newsletter = exists
        ? await Newsletter.findOneAndUpdate({ _id: exists._id }, { lang, meta }, { new: true })
        : await Newsletter.create({
            tenant: req.tenant,
            email: emailNorm,
            verified: false,
            lang,
            meta,
            subscribeDate: new Date(),
          });

      // Opt-in maili
      await sendEmail({
        to: emailNorm,
        subject: t("email.verifySubject", { brand: brandName }),
        html: t("email.verifyBody", { brand: brandName, brandWebsite }),
        tenantSlug: req.tenant,
        from: senderEmail,
      });

      // 🔔 v2 Notification (admin + moderator) + 10dk dedupe
      const title: Record<SupportedLocale, string> = {} as any;
      const message: Record<SupportedLocale, string> = {} as any;
      for (const lng of SUPPORTED_LOCALES) {
        const tl = (k: string, p?: any) => translate(k, lng, translations, p);
        title[lng]   = tl("notification.newSubscriberTitle", { brand: brandName });
        message[lng] = tl("notification.newSubscriberMsg",   { email: emailNorm });
      }

      const dedupeWindowMin = 10;
      const dedupeKey = `${req.tenant}:newsletter:subscribe:${emailNorm}`;
      const since = new Date(Date.now() - dedupeWindowMin * 60_000);
      const dup = await Notification.findOne({ tenant: req.tenant, dedupeKey, createdAt: { $gte: since } });
      if (!dup) {
        await Notification.create({
          tenant: req.tenant,
          type: "info",
          title,
          message,
          channels: ["inapp"],
          target: { roles: ["admin","moderator"] },
          source: { module: "newsletter", entity: "subscriber", refId: newsletter._id, event: "newsletter.subscribed" },
          tags: ["newsletter","subscribe"],
          link: { routeName: "admin.newsletter.subscribers", params: { id: String(newsletter._id) } },
          dedupeKey,
          dedupeWindowMin,
        });
      }

      res.status(201).json({ success: true, message: t("subscriptionSuccess"), data: newsletter });
    } catch (error) {
      next(error);
    }
  }
);


// ✅ Public: Unsubscribe (çıkış)
// ✅ Public: Unsubscribe — v2 notifications
export const unsubscribeNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (k: string, p?: any) => translate(k, locale, translations, p);

    try {
      const { email } = req.body;
      const tenantData = req.tenantData;
      const brandName   = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
      const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";

      if (!email) {
        res.status(400).json({ success: false, message: t("emailRequired") });
        return;
      }

      const { Newsletter, Notification } = await getTenantModels(req);
      const emailNorm = String(email).toLowerCase().trim();

      const unsubscribed = await Newsletter.findOneAndUpdate(
        { tenant: req.tenant, email: emailNorm },
        { unsubscribeDate: new Date() },
        { new: true }
      );

      if (!unsubscribed) {
        res.status(404).json({ success: false, message: t("notFound") });
        return;
      }

      await sendEmail({
        to: emailNorm,
        subject: t("email.unsubscribeSubject", { brand: brandName }),
        html: t("email.unsubscribeBody", { brand: brandName }),
        tenantSlug: req.tenant,
        from: senderEmail,
      });

      // 🔔 v2 Notification
      const title: Record<SupportedLocale, string> = {} as any;
      const message: Record<SupportedLocale, string> = {} as any;
      for (const lng of SUPPORTED_LOCALES) {
        const tl = (k: string, p?: any) => translate(k, lng, translations, p);
        title[lng]   = tl("notification.unsubscribeTitle", { brand: brandName });
        message[lng] = tl("notification.unsubscribeMsg",   { email: emailNorm });
      }

      await Notification.create({
        tenant: req.tenant,
        type: "warning",
        title,
        message,
        channels: ["inapp"],
        target: { roles: ["admin","moderator"] },
        source: { module: "newsletter", entity: "subscriber", refId: unsubscribed._id, event: "newsletter.unsubscribed" },
        tags: ["newsletter","unsubscribe"],
        link: { routeName: "admin.newsletter.subscribers", params: { id: String(unsubscribed._id) } },
      });

      res.status(200).json({ success: true, message: t("unsubscribed"), data: unsubscribed });
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
    const t = (k: string, p?: any) => translate(k, locale, translations, p);

    try {
      const { Newsletter, Notification } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ success: false, message: t("invalidId") });
        return;
      }

      const sub = await Newsletter.findOne({ _id: id, tenant: req.tenant });
      if (!sub) {
        res.status(404).json({ success: false, message: t("notFound") });
        return;
      }

      await Newsletter.deleteOne({ _id: id, tenant: req.tenant });

      const title: Record<SupportedLocale, string> = {} as any;
      const message: Record<SupportedLocale, string> = {} as any;
      for (const lng of SUPPORTED_LOCALES) {
        const tl = (k: string, p?: any) => translate(k, lng, translations, p);
        title[lng]   = tl("notification.deletedTitle");
        message[lng] = tl("notification.deletedMsg", { email: sub.email });
      }

      await Notification.create({
        tenant: req.tenant,
        type: "warning",
        title,
        message,
        channels: ["inapp"],
        target: { roles: ["admin","moderator"] },
        source: { module: "newsletter", entity: "subscriber", refId: sub._id, event: "newsletter.deleted" },
        tags: ["newsletter","delete"],
        link: { routeName: "admin.newsletter.subscribers" },
      });

      res.status(200).json({ success: true, message: t("deleted") });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Verify subscriber — v2 notifications
export const verifySubscriber = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (k: string, p?: any) => translate(k, locale, translations, p);

    try {
      const { Newsletter, Notification } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({ success: false, message: t("invalidId") });
        return;
      }

      const updated = await Newsletter.findOneAndUpdate(
        { _id: id, tenant: req.tenant },
        { verified: true },
        { new: true }
      );
      if (!updated) {
        res.status(404).json({ success: false, message: t("notFound") });
        return;
      }

      const title: Record<SupportedLocale, string> = {} as any;
      const message: Record<SupportedLocale, string> = {} as any;
      for (const lng of SUPPORTED_LOCALES) {
        const tl = (k: string, p?: any) => translate(k, lng, translations, p);
        title[lng]   = tl("notification.verifiedTitle");
        message[lng] = tl("notification.verifiedMsg", { email: updated.email });
      }

      await Notification.create({
        tenant: req.tenant,
        type: "success",
        title,
        message,
        channels: ["inapp"],
        target: { roles: ["admin","moderator"] },
        source: { module: "newsletter", entity: "subscriber", refId: updated._id, event: "newsletter.verified" },
        tags: ["newsletter","verify"],
        link: { routeName: "admin.newsletter.subscribers", params: { id: String(updated._id) } },
      });

      res.status(200).json({ success: true, message: t("verified"), data: updated });
    } catch (error) {
      next(error);
    }
  }
);


// ✅ Admin: Send bulk — v2 notifications
export const sendBulkNewsletter = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (k: string, p?: any) => translate(k, locale, translations, p);

    try {
      const { subject, html, filter } = req.body;
      const tenantData = req.tenantData;
      const brandName   = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
      const brandWebsite = tenantData?.domain?.main ? `https://${tenantData.domain.main}` : process.env.BRAND_WEBSITE;
      const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";

      if (!subject || !html) {
        res.status(400).json({ success: false, message: t("bulk.requiredFields", "Konu ve içerik zorunlu!") });
        return;
      }

      const { Newsletter, Notification } = await getTenantModels(req);

      const query = { tenant: req.tenant, verified: true, unsubscribeDate: null, ...(filter || {}) };
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
              name: sub.email,
              subject,
              message: html,
              brandName,
              brandWebsite,
              locale,
            }),
            tenantSlug: req.tenant,
            from: senderEmail,
          });
          sentCount++;
        } catch (mailErr) {
          logger.error(`[NEWSLETTER] Bulk mail failed for ${sub.email}: ${mailErr}`, {
            module: "newsletter",
            event: "bulk.mail.fail",
            error: mailErr,
          });
        }
      }

      // 🔔 v2 Notification (özet)
      const title: Record<SupportedLocale, string> = {} as any;
      const message: Record<SupportedLocale, string> = {} as any;
      for (const lng of SUPPORTED_LOCALES) {
        const tl = (k: string, p?: any) => translate(k, lng, translations, p);
        title[lng]   = tl("notification.bulkTitle", { brand: brandName });
        message[lng] = tl("notification.bulkMsg", { count: sentCount, subject });
      }

      const dedupeWindowMin = 5;
      const dedupeKey = `${req.tenant}:newsletter:bulk:${subject || ""}`;
      const since = new Date(Date.now() - dedupeWindowMin * 60_000);
      const dup = await Notification.findOne({ tenant: req.tenant, dedupeKey, createdAt: { $gte: since } });
      if (!dup) {
        await Notification.create({
          tenant: req.tenant,
          type: "info",
          title,
          message,
          channels: ["inapp"],
          target: { roles: ["admin","moderator"] },
          source: { module: "newsletter", entity: "bulk", event: "newsletter.bulk_sent" },
          tags: ["newsletter","bulk"],
          link: { routeName: "admin.newsletter.subscribers" },
          data: { subject, sent: sentCount, total: subscribers.length, filter: filter || {} },
          dedupeKey,
          dedupeWindowMin,
        });
      }

      res.status(200).json({
        success: true,
        message: t("bulk.success", "Toplu e-posta gönderimi tamamlandı."),
        sent: sentCount,
        total: subscribers.length,
      });
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
