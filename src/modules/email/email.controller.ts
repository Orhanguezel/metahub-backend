import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/services/emailService";
import { readInboxEmails } from "@/services/emailReader";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { SupportedLocale } from "@/types/common";

// --- Lokalize + contextli logger helper
const getT = (req: Request) => (key: string, params?: any) =>
  translate(key, req.locale, translations, params);

// =================== SEND TEST EMAIL ===================
export const sendTestEmail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const t = getT(req);
    const { to, subject, message }: { to: string; subject: string; message: string } = req.body;

    if (!to || !subject || !message) {
      logger.withReq.error(req, t("email.send.missing_fields"));
      res.status(400).json({ message: t("email.send.missing_fields") });
      return;
    }

    // Marka & gönderici bilgisi tenant context'inden alınır!
    const brand =
      req.tenantData?.name?.[req.locale as SupportedLocale] ||
      req.tenantData?.name?.en ||
      req.tenantData?.name ||
      "MetaHub";
    const senderEmail =
      req.tenantData?.emailSettings?.senderEmail || "noreply@example.com";

    const html = `
      <h2>${subject}</h2>
      <p>${message}</p>
      <br/>
      <small>This email was sent from the <strong>${brand}</strong> platform.</small>
    `;

    // 🟢 Multi-tenant email gönderimi
    await sendEmail({
      tenantSlug: req.tenant,
      to,
      subject,
      html,
      from: senderEmail,
    });

    await EmailMessage.create({
      from: senderEmail,
      tenant: req.tenant,
      subject,
      body: message,
      date: new Date(),
      isRead: false,
      isArchived: false,
    });

    logger.withReq.info(req, t("email.send.success", { to, subject }));

    res.status(200).json({
      success: true,
      message: t("email.send.success", { to, subject }),
    });
  }
);

// =================== GET ALL EMAILS ===================
export const getAllMails = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const t = getT(req);

    const mails = await EmailMessage.find({ tenant: req.tenant }).sort({ createdAt: -1 });

    logger.withReq.info(req, t("email.get.all.success", { count: mails.length }));

    res.status(200).json(mails);
  }
);

// =================== GET SINGLE EMAIL BY ID ===================
export const getMailById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const t = getT(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.error(req, t("email.get.invalid_id", { id }));
      res.status(400).json({ message: t("email.get.invalid_id", { id }) });
      return;
    }

    const mail = await EmailMessage.findOne({ _id: id, tenant: req.tenant });
    if (!mail) {
      logger.withReq.error(req, t("email.get.not_found", { id }));
      res.status(404).json({ message: t("email.get.not_found", { id }) });
      return;
    }

    logger.withReq.info(req, t("email.get.single.success", { id }));

    res.status(200).json(mail);
  }
);

// =================== DELETE EMAIL ===================
export const deleteMail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const t = getT(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      logger.withReq.error(req, t("email.delete.invalid_id", { id }));
      res.status(400).json({ message: t("email.delete.invalid_id", { id }) });
      return;
    }

    const mail = await EmailMessage.findOneAndDelete({ _id: id, tenant: req.tenant });
    if (!mail) {
      logger.withReq.error(req, t("email.delete.not_found", { id }));
      res.status(404).json({ message: t("email.delete.not_found", { id }) });
      return;
    }

    logger.withReq.info(req, t("email.delete.success", { id, subject: mail.subject }));

    res.status(200).json({
      message: t("email.delete.success", { id, subject: mail.subject }),
    });
  }
);

// =================== FETCH EMAILS MANUALLY (INBOX SYNC) ===================
export const fetchEmailsManually = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const t = getT(req);

    await readInboxEmails();

    logger.withReq.info(req, t("email.inbox.sync.success"));

    res.status(200).json({
      message: t("email.inbox.sync.success"),
    });
  }
);

// =================== MARK EMAIL AS READ/UNREAD ===================
export const markAsReadOrUnread = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const t = getT(req);
    const { id } = req.params;
    const { isRead }: { isRead: boolean } = req.body;

    if (!isValidObjectId(id)) {
      logger.withReq.error(req, t("email.readflag.invalid_id", { id }));
      res.status(400).json({ message: t("email.readflag.invalid_id", { id }) });
      return;
    }

    const mail = await EmailMessage.findOne({ _id: id, tenant: req.tenant });
    if (!mail) {
      logger.withReq.error(req, t("email.readflag.not_found", { id }));
      res.status(404).json({ message: t("email.readflag.not_found", { id }) });
      return;
    }

    mail.isRead = isRead;
    await mail.save();

    logger.withReq.info(req, t("email.readflag.success", { id, isRead }));

    res.status(200).json({
      message: t("email.readflag.success", { id, isRead }),
      mail,
    });
  }
);
