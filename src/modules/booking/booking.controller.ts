import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import Booking from "./booking.models";
import Notification from "../notification/notification.models";
import { sendEmail } from "@/services/emailService";
import { BookingConfirmationTemplate } from "@/templates/bookingConfirmation";
import { isValidObjectId } from "@/core/utils/validation";
import { getSettingValue } from "@/core/utils/settingUtils";

// ✅ Create Booking
export const createBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, serviceType, note, date, time, service, durationMinutes = 60, language = "en" } = req.body;

  if (!name || !email || !serviceType || !date || !time || !service) {
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
        { $gt: [{ $toDate: { $dateAdd: { startDate: { $concat: ["$date", "T", "$time"] }, unit: "minute", amount: "$durationMinutes" } } }, start.toDate()] },
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

  const htmlToCustomer = BookingConfirmationTemplate({ name, service: serviceType, date, time });

  const htmlToAdmin = `
    <h2>📬 New Booking</h2>
    <ul>
      <li><strong>Name:</strong> ${name}</li>
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
    message: `${name} booked ${serviceType} for ${date} ${time}.`,
    type: "info",
    user: req.user?.id || null,
  });

  res.status(201).json({
    success: true,
    message: "Booking created successfully.",
    booking,
  });
});

// ✅ Get All Bookings
export const getAllBookings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { language } = req.query;

  const filter = language ? { language: { $eq: language } } : {};

  const bookings = await Booking.find(filter)
    .populate("service")
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(bookings);
});

// ✅ Get Booking By ID
export const getBookingById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid booking ID." });
    return;
  }

  const booking = await Booking.findById(id).populate("service");

  if (!booking) {
    res.status(404).json({ message: "Booking not found." });
    return;
  }

  res.status(200).json(booking);
});

// ✅ Update Booking Status
export const updateBookingStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid booking ID." });
    return;
  }

  const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true });

  if (!booking) {
    res.status(404).json({ message: "Booking not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Booking status updated successfully.",
    booking,
  });
});

// ✅ Delete Booking
export const deleteBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid booking ID." });
    return;
  }

  const booking = await Booking.findByIdAndDelete(id);

  if (!booking) {
    res.status(404).json({ message: "Booking not found or already deleted." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Booking deleted successfully.",
  });
});
