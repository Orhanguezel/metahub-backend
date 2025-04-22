import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import MailMessage, { IMailMessage } from "./email.models";
import { sendEmail } from "../../services/emailService";
import { readInboxEmails } from "../../services/emailReader";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Test e-posta gönder (Admin)
export const sendTestEmail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

    const html = `
    <h2>${subject}</h2>
    <p>${message}</p>
    <br/>
    <small>This email was sent from the <strong>Ensotek Cooling Systems</strong> platform.</small>
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
    const { lang } = req.query;
    const filter: any = {};

    if (lang) filter.language = lang;

    const mails = await MailMessage.find(filter).sort({ createdAt: -1 });
    res.status(200).json(mails);
  }
);

// ✅ Tek mail getir
export const getMailById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid mail ID" });
      return;
    }

    const mail = await MailMessage.findById(id);
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
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid mail ID" });
      return;
    }

    const mail = await MailMessage.findByIdAndDelete(id);
    if (!mail) {
      res.status(404).json({ message: "Mail not found" });
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
  async (_req: Request, res: Response): Promise<void> => {
    await readInboxEmails();

    res.status(200).json({
      message: "Neue E-Mails werden geprüft...",
    });
  }
);

// ✅ Okundu/okunmadı olarak işaretle
export const markAsReadOrUnread = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { isRead }: { isRead: boolean } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid mail ID" });
      return;
    }

    const mail = await MailMessage.findById(id);
    if (!mail) {
      res.status(404).json({ message: "Mail not found" });
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
