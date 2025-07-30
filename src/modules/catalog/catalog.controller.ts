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

// --- Katalog isteği gönderen kullanıcıya otomatik yanıt ve admin'e log ---
// Katalog PDF linkini tenant configden veya dinamik DB'den çekebilirsin.
// Burada dummy link var, productionda tenantData'dan veya dosya storage'dan al.
function getCatalogFile(
  tenantData: any,
  locale: SupportedLocale,
  catalogType?: string
) {
  // tenant: 'ensotek', domain: 'ensotek.com'
  const tenant =
    tenantData?.slug ||
    tenantData?.key ||
    (tenantData?.name?.en && tenantData?.name.en.toLowerCase());
  const domain =
    (tenantData?.domain?.main && `https://${tenantData.domain.main}`) ||
    "https://guezelwebdesign.com";

  const type = catalogType || "main";

  // Dosya adı: ensotek.catalog.pdf (veya bikes için: ensotek.bikes.catalog.pdf)
  const fileName =
    tenant + (type && type !== "main" ? `.${type}` : "") + `.catalog.pdf`;

  // Mapping varsa ve ilgili locale mevcutsa onu kullan
  if (
    tenant &&
    tenantData?.catalogs &&
    tenantData.catalogs[type] &&
    tenantData.catalogs[type][locale]
  ) {
    // Dosya ismini tenantData'dan da alabilirsin ama yukarıdaki gibi sabit de olabilir
    // tenantData.catalogs[type][locale] = "ensotek.catalog.pdf" olmalı
    const mappedFile = tenantData.catalogs[type][locale];
    const url = `${domain}/${tenant}/katalog/${locale}/${mappedFile}`;
    return { url, fileName: mappedFile };
  }

  // Mapping yoksa default pattern kullan
  const url = `${domain}/${tenant}/katalog/${locale}/${fileName}`;
  return { url, fileName };
}

// ✅ 1) Public: Yeni katalog isteği
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
        catalogType,
      } = req.body;

      if (!name || !email || !subject) {
        res.status(400).json({
          success: false,
          message: t("allFieldsRequired"),
        });
        return;
      }

      const finalLocale = (formLocale || locale) as SupportedLocale;
      const { CatalogRequest, Notification } = await getTenantModels(req);

      // --- 1) Gönderilen katalog dosyasını belirle (tenant'a, dile, tipe göre)
      const tenantData = req.tenantData;
      const brandName =
        tenantData?.name?.[finalLocale] ||
        tenantData?.name?.en ||
        tenantData?.name ||
        "Brand";
      const senderEmail = tenantData?.emailSettings?.senderEmail;
      const adminEmail = tenantData?.emailSettings?.adminEmail;
      const brandWebsite =
        (tenantData?.domain?.main && `https://${tenantData.domain.main}`) ??
        process.env.BRAND_WEBSITE ??
        "https://guezelwebdesign.com";

      const catalogFile = getCatalogFile(tenantData, finalLocale, catalogType);

      // --- 2) DB'ye kaydet
      const newRequest = await CatalogRequest.create({
        name,
        email,
        phone,
        company,
        tenant: req.tenant,
        locale: finalLocale,
        catalogType: catalogType || "main",
        sentCatalog: catalogFile, // Gönderilen dosya logu!
        subject,
        message,
        isRead: false,
        isArchived: false,
      });

      // --- 3) Kullanıcıya katalog dosyasını gönder
      await sendEmail({
        tenantSlug: req.tenant,
        to: email,
        subject: t("email.replySubject", { brand: brandName }),
        html: CatalogReplyTemplate({
          name,
          locale: finalLocale,
          brandName,
          brandWebsite,
          catalogFileUrl: catalogFile.url,
          catalogFileName: catalogFile.fileName,
        }),
        from: senderEmail,
      });

      // --- 4) Admin'e bilgilendirme (opsiyonel, daha detaylı log)
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
              <li><b>Dil:</b> ${finalLocale}</li>
              <li><b>Katalog Tipi:</b> ${catalogType || "main"}</li>
              <li><b>Katalog Dosyası:</b> <a href="${
                catalogFile.url
              }" target="_blank">${catalogFile.fileName}</a></li>
              <li><b>Konu:</b> ${subject}</li>
              <li><b>Mesaj:</b> <br/>${message || "-"}</li>
            </ul>
            <hr/><small>Otomatik bilgilendirme.</small>
          `,
          from: senderEmail,
        });
      }

      // --- 5) Admin notification log
      function fillTemplate(str, params) {
        return str.replace(
          /\{\{(.*?)\}\}/g,
          (_, key) => params[key.trim()] ?? ""
        );
      }

      const notifTitle: Record<SupportedLocale, string> = {} as any;
      const notifMsg: Record<SupportedLocale, string> = {} as any;

      for (const lng of SUPPORTED_LOCALES) {
        let titleTemplate = translate(
          "notification.newCatalogRequestTitle",
          lng,
          translations
        );
        let msgTemplate = translate(
          "notification.newCatalogRequest",
          lng,
          translations
        );

        notifTitle[lng] = fillTemplate(titleTemplate, {
          name,
          email,
          catalogType: catalogType || "main",
        });
        notifMsg[lng] = fillTemplate(msgTemplate, {
          name,
          email,
          catalogType: catalogType || "main",
        });
      }

      await Notification.create({
        tenant: req.tenant,
        type: "info",
        title: notifTitle,
        message: notifMsg,
        data: {
          catalogType: catalogType || "main",
          name,
          email,
          company: company || "",
          phone: phone || "",
          locale: finalLocale,
          subject,
          requestId: newRequest._id,
          sentCatalog: catalogFile, // PDF link vs.
        },
        isRead: false,
      });

      logger.withReq.info(
        req,
        `[Katalog Talebi] Kullanıcıya ${catalogFile.fileName} gönderildi - ${email}`
      );

      console.log(`[Katalog Talebi] Kullanıcıya ${catalogFile.fileName} gönderildi - ${email}`);

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
