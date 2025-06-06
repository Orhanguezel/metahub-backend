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
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

// ✨ Default Slot Rule (en genel fallback)
const DEFAULT_RULE = {
  startTime: "09:00",
  endTime: "18:00",
  intervalMinutes: 60,
  breakBetweenAppointments: 15,
  isActive: true,
};

// 🔐 Admin: Create slot rule (e.g., Monday 09:00–23:00 every week)
export const createSlotRule = asyncHandler(async (req: Request, res: Response) => {
  const {
    appliesToAll,
    dayOfWeek,
    startTime,
    endTime,
    intervalMinutes,
    breakBetweenAppointments,
  } = req.body;

  // Aynı gün için veya appliesToAll varsa tekrar eklenmesini engelle
  const exists = await BookingSlotRule.findOne(
    appliesToAll
      ? { appliesToAll: true }
      : { dayOfWeek }
  );
  if (exists) {
    res.status(409).json({ message: "Rule for this day (or global) already exists." });
    return;
  }

  const rule = await BookingSlotRule.create({
    appliesToAll: !!appliesToAll,
    dayOfWeek,
    startTime,
    endTime,
    intervalMinutes,
    breakBetweenAppointments,
  });

  res.status(201).json({ success: true, rule });
});

// 🔐 Admin: Create override for specific date
export const createSlotOverride = asyncHandler(async (req: Request, res: Response) => {
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
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    res.status(400).json({ message: "Date parameter is required." });
    return;
  }

  const day = dayjs(date, "YYYY-MM-DD").day();

  // 1. Özel gün kuralı? (dayOfWeek)
  let ruleDoc = await BookingSlotRule.findOne({ dayOfWeek: day, isActive: true });
  // 2. Haftalık genel kural? (appliesToAll)
  if (!ruleDoc) ruleDoc = await BookingSlotRule.findOne({ appliesToAll: true, isActive: true });

  // 3. Kural bulunamazsa en genel default (memory'den)
  const ruleData = ruleDoc
    ? {
        startTime: ruleDoc.startTime,
        endTime: ruleDoc.endTime,
        intervalMinutes: ruleDoc.intervalMinutes,
        breakBetweenAppointments: ruleDoc.breakBetweenAppointments,
      }
    : {
        ...DEFAULT_RULE,
        dayOfWeek: day,
      };

  // 4. Override (tatil vb)
  const override = await BookingSlotOverride.findOne({ date });
  if (override?.fullDayOff) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

  // 5. Slotları oluştur
  const start = dayjs(`${date} ${ruleData.startTime}`, "YYYY-MM-DD HH:mm");
  const end = dayjs(`${date} ${ruleData.endTime}`, "YYYY-MM-DD HH:mm");
  const disabledTimes = override?.disabledTimes || [];

  const bookings = await Booking.find({ date, status: "confirmed" });

  const slots: string[] = [];
  let pointer = start;

  while (pointer.add(ruleData.intervalMinutes, "minute").isBefore(end)) {
    const timeStr = pointer.format("HH:mm");
    const isDisabled = disabledTimes.includes(timeStr);
    const isBooked = bookings.some((b) => b.time === timeStr);

    if (!isDisabled && !isBooked) {
      slots.push(timeStr);
    }

    pointer = pointer.add(
      ruleData.intervalMinutes + ruleData.breakBetweenAppointments,
      "minute"
    );
  }

  res.status(200).json({ success: true, slots });
  return;
});

// 🔐 Admin: Delete slot rule by ID
export const deleteSlotRule = asyncHandler(async (req: Request, res: Response) => {
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
export const deleteSlotOverride = asyncHandler(async (req: Request, res: Response) => {
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

// 📅 Public: Get slots by specific date (Klasik getSlotsByDate)
export const getSlotsByDate = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;

  if (!date || typeof date !== "string") {
    res.status(400).json({ message: "Query param 'date' is required in YYYY-MM-DD format." });
    return;
  }

  const dayOfWeek = dayjs(date).day();

  // 1. Önce spesifik gün kuralı, sonra appliesToAll, en sonda default
  let rule = await BookingSlotRule.findOne({ dayOfWeek, isActive: true });
  if (!rule) rule = await BookingSlotRule.findOne({ appliesToAll: true, isActive: true });

  if (!rule) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

  // 2. Override kontrolü
  const override = await BookingSlotOverride.findOne({ date });

  if (override?.fullDayOff) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

  // 3. Slotları oluştur
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
  confirmedBookings.forEach((b) => bookedTimes.add(b.time));

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
