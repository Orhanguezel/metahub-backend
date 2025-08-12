import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import { sendEmail } from "@/services/emailService";
import { BookingReceivedTemplate } from "@/modules/booking/templates/bookingReceived";
import { getSettingValue } from "@/core/utils/settingUtils";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { SUPPORTED_LOCALES } from "@/types/common";

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
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
    req.locale || language || (process.env.LOG_LOCALE as SupportedLocale) || "en";
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const tenantData = req.tenantData;
  const brandName =
    tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
  const brandWebsite =
    (tenantData?.domain?.main && `https://${tenantData.domain.main}`) ??
    process.env.BRAND_WEBSITE ??
    "https://guezelwebdesign.com";

  const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";

  // Zorunlu alan kontrolü
  if (!name || !email || !serviceType || !date || !time || !service) {
    logger.withReq.warn(req, t("public.create.missingFields"));
    res.status(400).json({ success: false, message: t("public.create.missingFields") });
    return;
  }

  const start = dayjs(`${date}T${time}`);
  const end = start.add(durationMinutes, "minute");

  const maxConcurrentBookingsSetting = await getSettingValue("max_concurrent_bookings");
  const maxConcurrentBookings = parseInt(maxConcurrentBookingsSetting || "1", 10);

  const { Booking, Notification } = await getTenantModels(req);

  // çakışan rezervasyon kontrolü
  const overlappingBookings = await Booking.find({
    date,
    $expr: {
      $and: [
        { $lt: [{ $toDate: { $concat: ["$date", "T", "$time"] } }, end.toDate()] },
        {
          $gt: [
            {
              $toDate: {
                $dateAdd: {
                  startDate: { $toDate: { $concat: ["$date", "T", "$time"] } },
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
    res.status(409).json({ success: false, message: t("public.create.slotsFull") });
    return;
  }

  // Booking oluştur
  const booking = await Booking.create({
    user: (req.user as any)?.id || undefined,
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

  // Müşteri maili
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
    userId: (req.user as any)?.id,
    ip: req.ip,
    loggerLocale: locale,
  });

  // Admin maili
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

  // Çok dilli title/message
  const title: Record<SupportedLocale, string> = {} as any;
  const message: Record<SupportedLocale, string> = {} as any;
  for (const lng of SUPPORTED_LOCALES) {
    const tLang = (key: string, params?: any) => translate(key, lng, translations, params);
    title[lng] = tLang("public.notification.title");
    message[lng] = tLang("public.notification.message", {
      name,
      service: serviceType,
      date,
      time,
    });
  }

  // 🔔 Notification v2 (admin + moderator hedefli, dedupe'lu)
  const target = { roles: ["admin", "moderator"] };
  const source = {
    module: "booking",
    entity: "booking",
    refId: booking._id,
    event: "booking.created",
  };
  const tags = ["booking", "public", serviceType].filter(Boolean);

  // 10 dk dedupe → aynı tenant+email+date/time için tekrar bildirim atma
  const dedupeWindowMin = 10;
  const actorKey = (email || (req.user as any)?._id || "guest").toString();
  const dedupeKey = `${req.tenant}:booking:${date}:${time}:${actorKey}`;

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
      message,
      user: (req.user as any)?._id || (req.user as any)?.id || null,
      target,                 // admin/moderator
      channels: ["inapp"],    // FE in-app feed
      data: {
        bookingId: booking._id,
        name,
        email,
        phone,
        serviceType,
        service,
        date,
        time,
        durationMinutes,
        note: note || undefined,
      },
      priority: 3,
      source,
      tags,
      dedupeKey,
      dedupeWindowMin,
      link: {
        routeName: "admin.bookings",   // FE’deki gerçek route adınız
        params: { id: String(booking._id) },
      },
    });
  } else {
    logger.withReq.info(req, "notification_deduped_booking", {
      tenant: req.tenant,
      dedupeKey,
      windowMin: dedupeWindowMin,
    });
  }

  res.status(201).json({
    success: true,
    message: t("public.create.success"),
    booking,
  });
  return;
});
