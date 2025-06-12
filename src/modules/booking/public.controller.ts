import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import { Booking } from "@/modules/booking";
import { Notification } from "@/modules/notification";
import { sendEmail } from "@/services/emailService";
import { BookingReceivedTemplate } from "@/modules/booking/templates/bookingReceived";
import { getSettingValue } from "@/core/utils/settingUtils";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// Yardımcı fonksiyon: Hem response, hem log için locale destekli
function bookingT(
  key: string,
  locale?: SupportedLocale,
  vars?: Record<string, any>
) {
  return t(key, locale || getLogLocale(), translations, vars);
}

export const createBooking = asyncHandler(
  async (req: Request, res: Response) => {
    let {
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

    // User'ın locale'i (middleware ile atanırsa req.locale, yoksa body/query/env)
    const userLocale: SupportedLocale =
      req.locale ||
      language ||
      (process.env.LOG_LOCALE as SupportedLocale) ||
      "en";

    // Name zorunlu alan ve object olmalı (örn: { tr, en, de, ... })
    if (
      typeof name !== "object" ||
      !name[userLocale] ||
      !email ||
      !serviceType ||
      !date ||
      !time ||
      !service
    ) {
      logger.warn(bookingT("public.create.missingFields", getLogLocale()));
      res.status(400).json({
        success: false,
        message: bookingT("public.create.missingFields", userLocale),
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

    if (overlappingBookings.length >= maxConcurrentBookings) {
      logger.warn(bookingT("public.create.slotsFull", getLogLocale()));
      res.status(409).json({
        success: false,
        message: bookingT("public.create.slotsFull", userLocale),
      });
      return;
    }

    const booking = await Booking.create({
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
      language: userLocale,
    });

    logger.info(
      bookingT("public.create.created", getLogLocale(), {
        name: name[userLocale],
        date,
        time,
      })
    );

    // Müşteriye mail (i18n template)
    const htmlToCustomer = BookingReceivedTemplate({
      name: name[userLocale],
      service: serviceType,
      date,
      time,
    });

    // Admin mail (i18n, kısmen vars kullanılıyor)
    const htmlToAdmin = `
    <h2>📬 ${bookingT("public.adminMail.newBooking", userLocale)}</h2>
    <ul>
      <li><strong>${bookingT("public.adminMail.name", userLocale)}:</strong> ${
      name[userLocale]
    }</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>${bookingT("public.adminMail.phone", userLocale)}:</strong> ${
      phone || "-"
    }</li>
      <li><strong>${bookingT(
        "public.adminMail.service",
        userLocale
      )}:</strong> ${serviceType}</li>
      <li><strong>${bookingT(
        "public.adminMail.date",
        userLocale
      )}:</strong> ${date}</li>
      <li><strong>${bookingT(
        "public.adminMail.time",
        userLocale
      )}:</strong> ${time}</li>
      <li><strong>${bookingT("public.adminMail.note", userLocale)}:</strong> ${
      note || "-"
    }</li>
    </ul>`;

    await Promise.all([
      sendEmail({
        to: email,
        subject: bookingT("public.email.subject.customer", userLocale),
        html: htmlToCustomer,
      }),
      sendEmail({
        to: process.env.SMTP_FROM || "admin@example.com",
        subject: bookingT("public.email.subject.admin", userLocale),
        html: htmlToAdmin,
      }),
    ]);

    // Admin notification (i18n)
    await Notification.create({
      title: bookingT("public.notification.title", userLocale),
      message: bookingT("public.notification.message", userLocale, {
        name: name[userLocale],
        service: serviceType,
        date,
        time,
      }),
      type: "info",
      user: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      message: bookingT("public.create.success", userLocale),
      booking,
    });
  }
);
