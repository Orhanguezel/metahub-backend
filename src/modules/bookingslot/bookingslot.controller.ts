// @/modules/bookingSlot/bookingSlot.controller.ts

import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Booking } from "@/modules/booking";
import {
  BookingSlotRule,
  BookingSlotOverride,
} from "@/modules/bookingslot";
import { isValidObjectId } from "@/core/utils/validation";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

// Plugin’i dayjs’e tanıt
dayjs.extend(isSameOrBefore);

// 🔐 Admin: Create slot rule (e.g., Monday 09:00–23:00 every week)
export const createSlotRule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { dayOfWeek, startTime, endTime, intervalMinutes, breakBetweenAppointments } = req.body;

  const exists = await BookingSlotRule.findOne({ dayOfWeek });
  if (exists) {
    res.status(409).json({ message: "Rule for this day already exists." });
    return;
  }

  const rule = await BookingSlotRule.create({
    dayOfWeek,
    startTime,
    endTime,
    intervalMinutes,
    breakBetweenAppointments,
  });

  res.status(201).json({ success: true, rule });
});

// 🔐 Admin: Create override for specific date
export const createSlotOverride = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { date, disabledTimes = [], fullDayOff = false } = req.body;

  const existing = await BookingSlotOverride.findOne({ date });
  if (existing) {
    res.status(409).json({ message: "Override already exists for this date." });
    return;
  }

  const override = await BookingSlotOverride.create({ date, disabledTimes, fullDayOff });
  res.status(201).json({ success: true, override });
});

// 🔓 Public: Get available slots for a date
export const getAvailableSlots = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    res.status(400).json({ message: "Date parameter is required." });
    return;
  }

  const day = dayjs(date, "YYYY-MM-DD").day();
  const rule = await BookingSlotRule.findOne({ dayOfWeek: day, isActive: true });

  if (!rule) {
    res.status(200).json({ success: true, slots: [] }); // No working hours that day
    return;
  }

  const override = await BookingSlotOverride.findOne({ date });
  if (override?.fullDayOff) {
    res.status(200).json({ success: true, slots: [] }); // Whole day off
    return;
  }

  // Slot oluştur
  const start = dayjs(`${date} ${rule.startTime}`, "YYYY-MM-DD HH:mm");
  const end = dayjs(`${date} ${rule.endTime}`, "YYYY-MM-DD HH:mm");
  const disabledTimes = override?.disabledTimes || [];

  const bookings = await Booking.find({ date, status: "confirmed" });

  const slots: string[] = [];
  let pointer = start;

  while (pointer.add(rule.intervalMinutes, "minute").isBefore(end)) {
    const timeStr = pointer.format("HH:mm");

    const isDisabled = disabledTimes.includes(timeStr);
    const isBooked = bookings.some((b) => b.time === timeStr);

    if (!isDisabled && !isBooked) {
      slots.push(timeStr);
    }

    pointer = pointer.add(rule.intervalMinutes + rule.breakBetweenAppointments, "minute");
  }

  res.status(200).json({ success: true, slots });
});

// 🔐 Admin: Delete slot rule by ID
export const deleteSlotRule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid ID." });
    return;
  }

  const deleted = await BookingSlotRule.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ message: "Rule not found." });
    return;
  }

  res.status(200).json({ success: true, message: "Slot rule deleted." });
});

// 🔐 Admin: Delete override by ID
export const deleteSlotOverride = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid ID." });
    return;
  }

  const deleted = await BookingSlotOverride.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ message: "Override not found." });
    return;
  }

  res.status(200).json({ success: true, message: "Override deleted." });
});


// 📅 Public: Get slots by specific date
export const getSlotsByDate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    res.status(400).json({ message: "Query param 'date' is required in YYYY-MM-DD format." });
    return;
  }

  const dayOfWeek = dayjs(date).day(); // 0 = Sunday ... 6 = Saturday

  // 1. Slot kurallarını getir
  const rule = await BookingSlotRule.findOne({ dayOfWeek, isActive: true });
  if (!rule) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

  // 2. Override kontrol et (tatil günleri vs.)
  const override = await BookingSlotOverride.findOne({ date });

  if (override?.fullDayOff) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

  // 3. Saatleri oluştur
  const availableSlots: string[] = [];
  const interval = rule.intervalMinutes;
  const breakTime = rule.breakBetweenAppointments;

  let current = dayjs(`${date}T${rule.startTime}`);
  const end = dayjs(`${date}T${rule.endTime}`);

  while (current.add(interval, "minute").isSameOrBefore(end)) {
    const time = current.format("HH:mm");
    availableSlots.push(time);
    current = current.add(interval + breakTime, "minute");
  }

  // 4. Onaylanmış randevuları al
  const confirmedBookings = await Booking.find({
    date,
    status: "confirmed",
  }).select("time durationMinutes");

  const bookedTimes = new Set<string>();

  confirmedBookings.forEach((b) => {
    bookedTimes.add(b.time);
  });

  // 5. Override edilen saatleri çıkar
  const disabledTimes = new Set(override?.disabledTimes || []);

  // 6. Filtrele
  const finalSlots = availableSlots.filter(
    (slot) => !bookedTimes.has(slot) && !disabledTimes.has(slot)
  );

  res.status(200).json({
    success: true,
    slots: finalSlots,
  });
});

// ✅ Tüm Slot Kurallarını Listele
export const getAllSlotRules = asyncHandler(async (req: Request, res: Response) => {
  const rules = await BookingSlotRule.find().sort("dayOfWeek");
  res.status(200).json({ success: true, data: rules });
});

// ✅ Tüm Override'ları Listele
export const getAllSlotOverrides = asyncHandler(async (req: Request, res: Response) => {
  const overrides = await BookingSlotOverride.find().sort("-date");
  res.status(200).json({ success: true, data: overrides });
});

