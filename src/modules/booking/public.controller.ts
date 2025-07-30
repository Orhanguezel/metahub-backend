import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import { Notification } from "@/modules/notification";
import { sendEmail } from "@/services/emailService";
import { BookingReceivedTemplate } from "@/modules/booking/templates/bookingReceived";
import { getSettingValue } from "@/core/utils/settingUtils";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES } from "@/types/common";

export const createBooking = asyncHandler(
  async (req: Request, res: Response) => {
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
      language,
    } = req.body;

    const locale: SupportedLocale =
      req.locale ||
      language ||
      (process.env.LOG_LOCALE as SupportedLocale) ||
      "en";
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const tenantData = req.tenantData;
    const brandName =
      tenantData?.name?.[locale] ||
      tenantData?.name?.en ||
      tenantData?.name ||
      "Brand";
    const brandWebsite =
      (tenantData?.domain?.main && `https://${tenantData.domain.main}`) ??
      process.env.BRAND_WEBSITE ??
      "https://guezelwebdesign.com";

    const senderEmail =
      tenantData?.emailSettings?.senderEmail || "noreply@example.com";

    // 🚨 Güvenli zorunlu alan kontrolü
    if (!name || !email || !serviceType || !date || !time || !service) {
      logger.withReq.warn(req, t("public.create.missingFields"));
      res.status(400).json({
        success: false,
        message: t("public.create.missingFields"),
      });
      return;
    }

    const start = dayjs(`${date}T${time}`);
    const end = start.add(durationMinutes, "minute");

    const maxConcurrentBookingsSetting = await getSettingValue(
      "max_concurrent_bookings"
    );
    const maxConcurrentBookings = parseInt(
      maxConcurrentBookingsSetting || "1",
      10
    );

    const { Booking } = await getTenantModels(req);

    const overlappingBookings = await Booking.find({
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
                    startDate: {
                      $toDate: { $concat: ["$date", "T", "$time"] },
                    },
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

    if (overlappingBookings.length >= maxConcurrentBookings) {
      logger.withReq.warn(req, t("public.create.slotsFull"));
      res.status(409).json({
        success: false,
        message: t("public.create.slotsFull"),
      });
      return;
    }

    // 🔐 Booking oluşturuluyor
    const booking = await Booking.create({
      user: req.user?.id || undefined,
      name,
      email,
      phone,
      tenant: req.tenant,
      serviceType,
      note,
      date,
      time,
      service,
      durationMinutes,
      language: locale,
    });

    logger.withReq.info(req, t("public.create.created", { name, date, time }));

    // ✉️ Email: Customer
    const htmlToCustomer = BookingReceivedTemplate({
      name,
      service: serviceType,
      date,
      time,
      locale,
      brandName,
      brandWebsite,
      senderEmail,
      tenant: req.tenant,
      userId: req.user?.id,
      ip: req.ip,
      loggerLocale: locale,
    });

    // ✉️ Email: Admin
    const htmlToAdmin = `
    <h2>📬 ${t("public.adminMail.newBooking")}</h2>
    <ul>
      <li><strong>${t("public.adminMail.name")}:</strong> ${name}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>${t("public.adminMail.phone")}:</strong> ${phone || "-"}</li>
      <li><strong>${t("public.adminMail.service")}:</strong> ${serviceType}</li>
      <li><strong>${t("public.adminMail.date")}:</strong> ${date}</li>
      <li><strong>${t("public.adminMail.time")}:</strong> ${time}</li>
      <li><strong>${t("public.adminMail.note")}:</strong> ${note || "-"}</li>
    </ul>
  `;

    // 📬 Emailler gönderiliyor
    await Promise.all([
      sendEmail({
        tenantSlug: req.tenant,
        to: email,
        subject: t("public.email.subject.customer"),
        html: htmlToCustomer,
      }),
      sendEmail({
        tenantSlug: req.tenant,
        to: senderEmail,
        subject: t("public.email.subject.admin"),
        html: htmlToAdmin,
      }),
    ]);

    const title: Record<SupportedLocale, string> = {} as any;
const message: Record<SupportedLocale, string> = {} as any;
for (const lng of SUPPORTED_LOCALES) {
  const tLang = (key: string, params?: any) =>
    translate(key, lng, translations, params);

  title[lng] = tLang("public.notification.title");
  message[lng] = tLang("public.notification.message", {
    name,
    service: serviceType,
    date,
    time,
  });
}


    // 🔔 Bildirim
    await Notification.create({
      title,
      message,
      tenant: req.tenant,
      type: "info",
      user: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message: t("public.create.success"),
      booking,
    });
    return;
  }
);
