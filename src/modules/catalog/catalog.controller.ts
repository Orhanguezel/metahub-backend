import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { sendEmail } from "@/services/emailService";
import { CatalogReplyTemplate } from "@/modules/catalog/templates/catalogReplyTemplate";
import logger from "@/core/middleware/logger/logger";
import { SUPPORTED_LOCALES } from "@/types/common";

export const sendCatalogRequest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = (req as any).locale || getLogLocale();
    const t = (key: string, params?: any) => translate(key, locale, translations, params);

    try {
      const {
        name,
        email,
        phone,
        company,
        locale: formLocale,
        subject,
        message,
        catalogFileUrl,      // ✅ sadece direkt link
        catalogFileName,
      } = req.body;

      if (!name || !email || !subject || !catalogFileUrl) {
        res.status(400).json({ success: false, message: t("allFieldsRequired") });
        return;
      }

      const finalLocale = (formLocale || locale) as SupportedLocale;
      const { CatalogRequest, Notification } = await getTenantModels(req);

      const brandName =
        req.tenantData?.name?.[finalLocale] ||
        req.tenantData?.name?.en ||
        req.tenantData?.name ||
        "Brand";
      const senderEmail = req.tenantData?.emailSettings?.senderEmail;
      const adminEmail  = req.tenantData?.emailSettings?.adminEmail;
      const brandWebsite =
        (req.tenantData?.domain?.main && `https://${req.tenantData.domain.main}`) || undefined;

      // 1) Kayıt
      const newRequest = await CatalogRequest.create({
        name,
        email,
        phone,
        company,
        tenant: req.tenant,
        locale: finalLocale,
        sentCatalog: { url: catalogFileUrl, fileName: catalogFileName },
        subject,
        message,
        isRead: false,
        isArchived: false,
      });

      // 2) Müşteri e-postası
      await sendEmail({
        tenantSlug: req.tenant,
        to: email,
        subject: t("email.replySubject", { brand: brandName }),
        html: CatalogReplyTemplate({
          name,
          locale: finalLocale,
          brandName,
          brandWebsite,
          catalogFileUrl,
          catalogFileName,
          subject,
          message,
        }),
        from: senderEmail,
      });

      // 3) Admin e-postası (opsiyonel)
      if (adminEmail) {
        await sendEmail({
          tenantSlug: req.tenant,
          to: adminEmail,
          subject: `[Katalog] Yeni katalog talebi - ${brandName}`,
          html: `
            <h3>Yeni katalog talebi!</h3>
            <ul>
              <li><b>Ad:</b> ${name}</li>
              <li><b>E-Posta:</b> ${email}</li>
              <li><b>Telefon:</b> ${phone || "-"}</li>
              <li><b>Firma:</b> ${company || "-"}</li>
              <li><b>Katalog Dosyası:</b> <a href="${catalogFileUrl}" target="_blank">${catalogFileName || "PDF"}</a></li>
              <li><b>Konu:</b> ${subject}</li>
              <li><b>Mesaj:</b> <br/>${message || "-"}</li>
            </ul>
            <hr/><small>Otomatik bilgilendirme.</small>
          `,
          from: senderEmail,
        });
      }

      // 4) 🔔 v2 Notification (admin + moderator)
      const title: Record<SupportedLocale, string> = {} as any;
      const msg:   Record<SupportedLocale, string> = {} as any;
      for (const lng of SUPPORTED_LOCALES) {
        const tLng = (k: string, p?: any) => translate(k, lng, translations, p);
        title[lng] = tLng("catalog.notification.title") || "Yeni katalog talebi";
        msg[lng]   = tLng("catalog.notification.message", { name, email }) ||
                     `${name} (${email}) yeni bir katalog talebinde bulundu.`;
      }

      const target = { roles: ["admin", "moderator"] };
      const source = {
        module: "catalog",
        entity: "request",
        refId: newRequest._id,
        event: "catalog.requested",
      };
      const tags = ["catalog", "request"];

      // 10 dk dedupe: aynı tenant + email + subject
      const dedupeWindowMin = 10;
      const dedupeKey = `${req.tenant}:catalog:${(email || "").toLowerCase()}:${subject || ""}`;

      const since = new Date(Date.now() - dedupeWindowMin * 60 * 1000);
      const dup = await Notification.findOne({
        tenant: req.tenant,
        dedupeKey,
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 });

      if (!dup) {
        await Notification.create({
          tenant: req.tenant,
          type: "info",
          title,
          message: msg,
          user: (req.user as any)?._id || (req.user as any)?.id || null, // varsa aktör
          target,                 // 🎯 admin & moderator
          channels: ["inapp"],    // FE in-app feed
          priority: 3,
          data: {
            requestId: newRequest._id,
            name,
            email,
            phone: phone || "",
            company: company || "",
            subject,
            message: message || "",
            sentCatalog: { url: catalogFileUrl, fileName: catalogFileName },
          },
          source,
          tags,
          dedupeKey,
          dedupeWindowMin,
          link: {
            routeName: "admin.catalog.requests",   // FE’deki gerçek route adınızı koyun
            params: { id: String(newRequest._id) },
          },
        });
      } else {
        logger.withReq.info(req, "notification_deduped_catalog", {
          tenant: req.tenant,
          dedupeKey,
          windowMin: dedupeWindowMin,
        });
      }

      logger.withReq.info(req, `[Katalog Talebi] PDF linki gönderildi - ${email}`);

      res.status(201).json({
        success: true,
        message: t("messageSent"),
        data: newRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);



// ✅ 2) Admin: Tüm katalog taleplerini getir
export const getAllCatalogRequests = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    try {
      const { CatalogRequest } = await getTenantModels(req);
      const requests = await CatalogRequest.find({ tenant: req.tenant }).sort({
        createdAt: -1,
      });
      res.status(200).json({
        success: true,
        message: t("messagesFetched"),
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ 3) Admin: Tekli talebi sil
export const deleteCatalogRequest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    try {
      const { CatalogRequest } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: t("invalidMessageId"),
        });
        return;
      }

      const result = await CatalogRequest.deleteOne({
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

// ✅ 4) Admin: Okundu olarak işaretle
export const markCatalogRequestAsRead = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    try {
      const { CatalogRequest } = await getTenantModels(req);
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: t("invalidMessageId"),
        });
        return;
      }

      const updated = await CatalogRequest.findOneAndUpdate(
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
