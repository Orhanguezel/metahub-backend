import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import Appointment from "./appointment.models";
import Notification from "../notification/notification.models";
import { sendEmail } from "../../services/emailService";
import { appointmentConfirmationTemplate } from "../../templates/appointmentConfirmation";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Randevu Oluştur
export const createAppointment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      email,
      phone,
      serviceType,
      note,
      date,
      time,
      service,
      durationMinutes = 60,
    } = req.body;

    if (!name || !email || !serviceType || !date || !time || !service) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Bitte füllen Sie alle erforderlichen Felder aus."
            : req.locale === "tr"
            ? "Lütfen gerekli alanları doldurunuz."
            : "Please fill all required fields.",
      });
      return;
    }

    const start = dayjs(`${date}T${time}`);
    const end = start.add(durationMinutes, "minute");

    // ⛔ Çakışma kontrolü
    const existingAppointment = await Appointment.findOne({
      date,
      $expr: {
        $and: [
          {
            $lt: [
              { $toDate: { $concat: ["$date", "T", "$time"] } },
              end.toDate(),
            ],
          },
          {
            $gt: [
              {
                $toDate: {
                  $dateAdd: {
                    startDate: { $concat: ["$date", "T", "$time"] },
                    unit: "minute",
                    amount: "$durationMinutes",
                  },
                },
              },
              start.toDate(),
            ],
          },
        ],
      },
    });

    if (existingAppointment) {
      res.status(409).json({
        message:
          req.locale === "de"
            ? "Für diese Uhrzeit ist bereits ein Termin vorhanden."
            : req.locale === "tr"
            ? "Bu tarih ve saatte zaten bir randevu var."
            : "There is already an appointment for this time.",
      });
      return;
    }

    // ✅ Kayıt
    const appointment = await Appointment.create({
      user: req.user?.id || undefined,
      name,
      email,
      phone,
      serviceType,
      note,
      date,
      time,
      service,
      durationMinutes,
    });

    // ✅ E-posta
    const htmlToCustomer = appointmentConfirmationTemplate({
      name,
      service: serviceType,
      date,
      time,
    });

    const htmlToAdmin = `
    <h2>📬 Yeni Randevu</h2>
    <ul>
      <li><strong>Ad Soyad:</strong> ${name}</li>
      <li><strong>E-Posta:</strong> ${email}</li>
      <li><strong>Telefon:</strong> ${phone || "-"}</li>
      <li><strong>Hizmet:</strong> ${serviceType}</li>
      <li><strong>Tarih:</strong> ${date}</li>
      <li><strong>Saat:</strong> ${time}</li>
      <li><strong>Not:</strong> ${note || "-"}</li>
    </ul>
  `;

    await Promise.all([
      sendEmail({
        to: email,
        subject: "🗓️ Randevu Onayı – Anastasia Massage",
        html: htmlToCustomer,
      }),
      sendEmail({
        to: process.env.SMTP_FROM || "admin@example.com",
        subject: "🆕 Yeni Randevu Alındı",
        html: htmlToAdmin,
      }),
    ]);

    // 🔔 Bildirim
    void Notification.create({
      title: "Yeni Randevu",
      message: `${name} adlı kullanıcı ${serviceType} için ${date} ${time} tarihinde randevu aldı.`,
      type: "info",
      user: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Termin erfolgreich erstellt."
          : req.locale === "tr"
          ? "Randevu başarıyla oluşturuldu."
          : "Appointment created successfully.",
      appointment,
    });
  }
);

// ✅ Tüm randevuları getir
export const getAllAppointments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const appointments = await Appointment.find()
      .populate("service")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(appointments);
  }
);

// ✅ Tek randevuyu getir
export const getAppointmentById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Termin-ID."
            : req.locale === "tr"
            ? "Geçersiz randevu ID'si."
            : "Invalid appointment ID.",
      });
      return;
    }

    const appointment = await Appointment.findById(id).populate("service");
    if (!appointment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Termin wurde nicht gefunden."
            : req.locale === "tr"
            ? "Randevu bulunamadı."
            : "Appointment not found.",
      });
      return;
    }

    res.status(200).json(appointment);
  }
);

// ✅ Randevu durumunu güncelle
export const updateAppointmentStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Termin-ID."
            : req.locale === "tr"
            ? "Geçersiz randevu ID'si."
            : "Invalid appointment ID.",
      });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Termin wurde nicht gefunden."
            : req.locale === "tr"
            ? "Randevu bulunamadı."
            : "Appointment not found.",
      });
      return;
    }

    appointment.status = status;
    await appointment.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Terminstatus aktualisiert."
          : req.locale === "tr"
          ? "Randevu durumu güncellendi."
          : "Appointment status updated.",
      appointment,
    });
  }
);

// ✅ Randevuyu sil
export const deleteAppointment = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Termin-ID."
            : req.locale === "tr"
            ? "Geçersiz randevu ID'si."
            : "Invalid appointment ID.",
      });
      return;
    }

    const appointment = await Appointment.findByIdAndDelete(id);
    if (!appointment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Termin wurde nicht gefunden oder bereits gelöscht."
            : req.locale === "tr"
            ? "Randevu bulunamadı veya zaten silinmiş."
            : "Appointment not found or already deleted.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Termin erfolgreich gelöscht."
          : req.locale === "tr"
          ? "Randevu başarıyla silindi."
          : "Appointment deleted successfully.",
    });
  }
);
