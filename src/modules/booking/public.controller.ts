// @/modules/booking/public.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import { Booking } from "@/modules/booking";
import { Notification } from "@/modules/notification";
import { sendEmail } from "@/services/emailService";
import { BookingConfirmationTemplate } from "@/templates/bookingConfirmation";
import { getSettingValue } from "@/core/utils/settingUtils";

export const createBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    language = "en",
  } = req.body;

  // ✅ Yeni kontrol: name artık object olmalı
  if (
    typeof name !== "object" ||
    !name[language] ||
    !email ||
    !serviceType ||
    !date ||
    !time ||
    !service
  ) {
    res.status(400).json({ message: "Please fill all required fields." });
    return;
  }

  const start = dayjs(`${date}T${time}`);
  const end = start.add(durationMinutes, "minute");

  const maxConcurrentBookingsSetting = await getSettingValue("max_concurrent_bookings");
  const maxConcurrentBookings = parseInt(maxConcurrentBookingsSetting || "1", 10);

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
    res.status(409).json({ message: "All booking slots are full for this time." });
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
    language,
  });

  // ✅ name[language] kullanılmalı
  const htmlToCustomer = BookingConfirmationTemplate({
    name: name[language],
    service: serviceType,
    date,
    time,
  });

  const htmlToAdmin = `
    <h2>📬 New Booking</h2>
    <ul>
      <li><strong>Name:</strong> ${name[language]}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Phone:</strong> ${phone || "-"}</li>
      <li><strong>Service:</strong> ${serviceType}</li>
      <li><strong>Date:</strong> ${date}</li>
      <li><strong>Time:</strong> ${time}</li>
      <li><strong>Note:</strong> ${note || "-"}</li>
    </ul>`;

  await Promise.all([
    sendEmail({
      to: email,
      subject: "🗓️ Booking Confirmation – Anastasia Massage",
      html: htmlToCustomer,
    }),
    sendEmail({
      to: process.env.SMTP_FROM || "admin@example.com",
      subject: "🆕 New Booking Received",
      html: htmlToAdmin,
    }),
  ]);

  await Notification.create({
    title: "New Booking",
    message: `${name[language]} booked ${serviceType} for ${date} ${time}.`,
    type: "info",
    user: req.user?.id || null,
  });

  res.status(201).json({
    success: true,
    message: "Booking created successfully.",
    booking,
  });
});
