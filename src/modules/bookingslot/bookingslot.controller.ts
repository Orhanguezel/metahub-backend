import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

// Standart locale-aware t fonksiyonu!
function getT(req: Request) {
  const locale: SupportedLocale = req.locale || "en";
  return (key: string, params?: any) =>
    translate(key, locale, translations, params);
}

// 🔐 Admin: Create slot rule (label/description i18n!)
export const createSlotRule = asyncHandler(async (req: Request, res: Response) => {
  const {
    appliesToAll,
    dayOfWeek,
    startTime,
    endTime,
    intervalMinutes,
    breakBetweenAppointments,
    label,
    description,
  } = req.body;

  const t = getT(req);
  const { BookingSlotRule } = await getTenantModels(req);

  const exists = await BookingSlotRule.findOne(
    appliesToAll ? { appliesToAll: true, tenant: req.tenant } : { dayOfWeek, tenant: req.tenant }
  );
  if (exists) {
    res.status(409).json({
      success: false,
      message: t("slot.rule.exists"),
    });
    return;
  }

  const rule = await BookingSlotRule.create({
    appliesToAll: !!appliesToAll,
    dayOfWeek,
    startTime,
    endTime,
    tenant: req.tenant,
    intervalMinutes,
    breakBetweenAppointments,
    label: typeof label === "object" ? label : {},
    description: typeof description === "object" ? description : {},
  });

  res.status(201).json({
    success: true,
    rule,
    message: t("slot.rule.created"),
  });
});

// 🔐 Admin: Create override (i18n message)
export const createSlotOverride = asyncHandler(async (req: Request, res: Response) => {
  const { date, disabledTimes = [], fullDayOff = false } = req.body;
  const t = getT(req);
  const { BookingSlotOverride } = await getTenantModels(req);

  const existing = await BookingSlotOverride.findOne({
    date,
    tenant: req.tenant,
  });
  if (existing) {
    res.status(409).json({
      success: false,
      message: t("slot.override.exists"),
    });
    return;
  }

  const override = await BookingSlotOverride.create({
    date,
    disabledTimes,
    fullDayOff,
    tenant: req.tenant,
  });

  res.status(201).json({
    success: true,
    override,
    message: t("slot.override.created"),
  });
});

// 🔓 Public: Get available slots for a date
export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  const t = getT(req);
  const { BookingSlotRule, BookingSlotOverride, Booking } = await getTenantModels(req);

  if (!date || typeof date !== "string") {
    res.status(400).json({ message: t("slot.error.noDate") });
    return;
  }
  const day = dayjs(date, "YYYY-MM-DD").day();

  let ruleDoc = await BookingSlotRule.findOne({
    tenant: req.tenant,
    dayOfWeek: day,
    isActive: true,
  });
  if (!ruleDoc) ruleDoc = await BookingSlotRule.findOne({
    appliesToAll: true,
    isActive: true,
    tenant: req.tenant,
  });

  const ruleData = ruleDoc
    ? {
        startTime: ruleDoc.startTime,
        endTime: ruleDoc.endTime,
        intervalMinutes: ruleDoc.intervalMinutes,
        breakBetweenAppointments: ruleDoc.breakBetweenAppointments,
      }
    : {
        startTime: "09:00",
        endTime: "18:00",
        intervalMinutes: 60,
        breakBetweenAppointments: 15,
        dayOfWeek: day,
      };

  const override = await BookingSlotOverride.findOne({
    date,
    tenant: req.tenant,
  });
  if (override?.fullDayOff) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

  const start = dayjs(`${date} ${ruleData.startTime}`, "YYYY-MM-DD HH:mm");
  const end = dayjs(`${date} ${ruleData.endTime}`, "YYYY-MM-DD HH:mm");
  const disabledTimes = override?.disabledTimes || [];
  const bookings = await Booking.find({
    date,
    status: "confirmed",
    tenant: req.tenant,
  });

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

// 🔐 Admin: Delete slot rule by ID (i18n)
export const deleteSlotRule = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const t = getT(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: t("slot.error.invalidId") });
    return;
  }

  const { BookingSlotRule } = await getTenantModels(req);
  const deleted = await BookingSlotRule.deleteOne({
    _id: id,
    tenant: req.tenant,
  });
  if (!deleted || deleted.deletedCount === 0) {
    res.status(404).json({ message: t("slot.rule.notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("slot.rule.deleted"),
  });
});

// 🔐 Admin: Delete override by ID (i18n)
export const deleteSlotOverride = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const t = getT(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: t("slot.error.invalidId") });
    return;
  }

  const { BookingSlotOverride } = await getTenantModels(req);
  const deleted = await BookingSlotOverride.deleteOne({
    _id: id,
    tenant: req.tenant,
  });
  if (!deleted || deleted.deletedCount === 0) {
    res.status(404).json({ message: t("slot.override.notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("slot.override.deleted"),
  });
});

// 📅 Public: Get slots by specific date (getSlotsByDate)
export const getSlotsByDate = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  const t = getT(req);
  const { BookingSlotRule, BookingSlotOverride, Booking } = await getTenantModels(req);

  if (!date || typeof date !== "string") {
    res.status(400).json({
      message: t("slot.error.noDate"),
    });
    return;
  }

  const dayOfWeek = dayjs(date).day();

  let rule = await BookingSlotRule.findOne({
    dayOfWeek,
    isActive: true,
    tenant: req.tenant,
  });
  if (!rule)
    rule = await BookingSlotRule.findOne({
      appliesToAll: true,
      isActive: true,
      tenant: req.tenant,
    });

  if (!rule) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

  const override = await BookingSlotOverride.findOne({
    date,
    tenant: req.tenant,
  });

  if (override?.fullDayOff) {
    res.status(200).json({ success: true, slots: [] });
    return;
  }

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

  const confirmedBookings = await Booking.find({
    date,
    tenant: req.tenant,
    status: "confirmed",
  }).select("time durationMinutes");

  const bookedTimes = new Set<string>();
  confirmedBookings.forEach((b) => bookedTimes.add(b.time));
  const disabledTimes = new Set(override?.disabledTimes || []);

  const finalSlots = availableSlots.filter(
    (slot) => !bookedTimes.has(slot) && !disabledTimes.has(slot)
  );

  res.status(200).json({
    success: true,
    slots: finalSlots,
  });
});

// ✅ Tüm Slot Kurallarını Listele (i18n yok, data response)
export const getAllSlotRules = asyncHandler(async (req: Request, res: Response) => {
  const { BookingSlotRule } = await getTenantModels(req);
  const rules = await BookingSlotRule.find({ tenant: req.tenant }).sort("dayOfWeek");
  res.status(200).json({ success: true, data: rules });
});

// ✅ Tüm Override'ları Listele
export const getAllSlotOverrides = asyncHandler(async (req: Request, res: Response) => {
  const { BookingSlotOverride } = await getTenantModels(req);
  const overrides = await BookingSlotOverride.find({
    tenant: req.tenant,
  }).sort("-date");
  res.status(200).json({ success: true, data: overrides });
});
