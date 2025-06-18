import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { EmailMessage } from "@/modules/email";
import { sendEmail } from "@/services/emailService";
import { readInboxEmails } from "@/services/emailReader";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Test e-posta gönder (Admin)
export const sendTestEmail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const {
      to,
      subject,
      message,
    }: { to: string; subject: string; message: string } = req.body;

    if (!to || !subject || !message) {
      res
        .status(400)
        .json({ message: "Please provide 'to', 'subject' and 'message'." });
      return;
    }

    const brand = process.env.BRAND_NAME || "MetaHup";

    const html = `
    <h2>${subject}</h2>
    <p>${message}</p>
    <br/>
    <small>This email was sent from the <strong>${brand}</strong> platform.</small>
  `;

    await sendEmail({ to, subject, html });

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Test-E-Mail wurde erfolgreich gesendet."
          : req.locale === "tr"
          ? "Test e-postası başarıyla gönderildi."
          : "Test email sent successfully.",
    });
  }
);

// ✅ Tüm mailleri getir (opsiyonel dil filtresi)
export const getAllMails = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const { lang } = req.query;
    const filter: any = {};

    if (lang) {
      filter[`subject.${lang}`] = { $exists: true };
      filter[`body.${lang}`] = { $exists: true };
    }

    const mails = await EmailMessage.find(filter).sort({ createdAt: -1 });
    res.status(200).json(mails);
  }
);

// ✅ Tek mail getir
export const getMailById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid mail ID" });
      return;
    }

    const mail = await EmailMessage.findOne({ _id: id, tenant: req.tenant });
    if (!mail) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "E-Mail wurde nicht gefunden."
            : req.locale === "tr"
            ? "E-posta bulunamadı."
            : "Mail not found.",
      });
      return;
    }

    res.status(200).json(mail);
  }
);

// ✅ Mail sil
export const deleteMail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid mail ID" });
      return;
    }

    const mail = await EmailMessage.deleteOne({ _id: id, tenant: req.tenant });
    if (!mail) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "E-Mail wurde nicht gefunden."
            : req.locale === "tr"
            ? "E-posta bulunamadı."
            : "Mail not found.",
      });
      return;
    }

    res.status(200).json({
      message:
        req.locale === "de"
          ? "E-Mail wurde gelöscht."
          : req.locale === "tr"
          ? "E-posta başarıyla silindi."
          : "Mail deleted successfully.",
    });
  }
);

// ✅ Manuel e-posta okuma
export const fetchEmailsManually = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await readInboxEmails();

    res.status(200).json({
      message:
        req.locale === "de"
          ? "Neue E-Mails werden geprüft..."
          : req.locale === "tr"
          ? "Yeni e-postalar kontrol ediliyor..."
          : "Checking for new emails...",
    });
  }
);

// ✅ Okundu/okunmadı olarak işaretle
export const markAsReadOrUnread = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { EmailMessage } = await getTenantModels(req);
    const { id } = req.params;
    const { isRead }: { isRead: boolean } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid mail ID" });
      return;
    }

    const mail = await EmailMessage.findOne({ _id: id, tenant: req.tenant });
    if (!mail) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "E-Mail wurde nicht gefunden."
            : req.locale === "tr"
            ? "E-posta bulunamadı."
            : "Mail not found.",
      });
      return;
    }

    mail.isRead = isRead;
    await mail.save();

    res.status(200).json({
      message:
        req.locale === "de"
          ? `Nachricht als ${isRead ? "gelesen" : "ungelesen"} markiert.`
          : req.locale === "tr"
          ? `Mesaj ${isRead ? "okundu" : "okunmadı"} olarak işaretlendi.`
          : `Message marked as ${isRead ? "read" : "unread"}.`,
      mail,
    });
  }
);
