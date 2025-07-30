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

// ✅ Sadece kullanıcının verdiği direkt katalog linki ile çalışır
export const sendCatalogRequest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale: SupportedLocale = req.locale || getLogLocale();
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    try {
      const {
        name,
        email,
        phone,
        company,
        locale: formLocale,
        subject,
        message,
        catalogFileUrl, // <== ARTIK SADECE BUNU KULLANIYORUZ!
        catalogFileName,
      } = req.body;

      if (!name || !email || !subject || !catalogFileUrl) {
        res.status(400).json({
          success: false,
          message: t("allFieldsRequired"),
        });
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
      const adminEmail = req.tenantData?.emailSettings?.adminEmail;
      const brandWebsite =
        (req.tenantData?.domain?.main && `https://${req.tenantData.domain.main}`);

      // --- 1) DB'ye kaydet
      const newRequest = await CatalogRequest.create({
        name,
        email,
        phone,
        company,
        tenant: req.tenant,
        locale: finalLocale,
        sentCatalog: { url: catalogFileUrl, fileName: catalogFileName }, // Sadece bu!
        subject,
        message,
        isRead: false,
        isArchived: false,
      });

      // --- 2) Kullanıcıya PDF linkini gönder
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

      // --- 3) Admin’e bilgilendirme (opsiyonel)
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
              <li><b>Katalog Dosyası:</b> <a href="${catalogFileUrl}" target="_blank">${catalogFileName || "PDF dosyası"}</a></li>
              <li><b>Konu:</b> ${subject}</li>
              <li><b>Mesaj:</b> <br/>${message || "-"}</li>
            </ul>
            <hr/><small>Otomatik bilgilendirme.</small>
          `,
          from: senderEmail,
        });
      }

      // --- 4) Admin notification log
      const notifTitle: Record<SupportedLocale, string> = Object.fromEntries(
        SUPPORTED_LOCALES.map(lng => [lng, `${name} yeni katalog talebi gönderdi`])
      ) as Record<SupportedLocale, string>;

      const notifMsg: Record<SupportedLocale, string> = Object.fromEntries(
        SUPPORTED_LOCALES.map(lng => [lng, `${name} (${email}) yeni bir katalog talebinde bulundu.`])
      ) as Record<SupportedLocale, string>;

      for (const lng of SUPPORTED_LOCALES) {
        notifTitle[lng] = `${name} yeni katalog talebi gönderdi`;
        notifMsg[lng] = `${name} (${email}) yeni bir katalog talebinde bulundu.`;
      }

      await Notification.create({
        tenant: req.tenant,
        type: "info",
        title: notifTitle,
        message: notifMsg,
        data: {
          name,
          email,
          company: company || "",
          phone: phone || "",
          locale: finalLocale,
          subject,
          requestId: newRequest._id,
          sentCatalog: { url: catalogFileUrl, fileName: catalogFileName },
        },
        isRead: false,
      });

      logger.withReq.info(
        req,
        `[Katalog Talebi] Kullanıcıya PDF linki gönderildi - ${email}`
      );

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
