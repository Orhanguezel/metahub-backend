import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);

function getT(req: Request) {
  const locale: SupportedLocale = req.locale || "en";
  return (key: string, params?: any) =>
    translate(key, locale, translations, params);
}

/**
 * 1️⃣ PUBLIC: Çalışma Saatleri (Kurallar)
 *    GET /bookingslot/rules
 */
export const getAllSlotRulesPublic = asyncHandler(async (req: Request, res: Response) => {
  const t = getT(req);
  const { BookingSlotRule } = await getTenantModels(req);

  const rules = await BookingSlotRule.find({
    tenant: req.tenant,
    isActive: true,
  }).sort("dayOfWeek");

  res.status(200).json({
    success: true,
    rules, // Slice doğrudan 'rules' bekliyor!
    message: t("slot.rule.listed", "All active slot rules listed."),
  });
});

/**
 * 2️⃣ PUBLIC: Kapalı Günler / Overrides
 *    GET /bookingslot/overrides
 */
export const getAllSlotOverridesPublic = asyncHandler(async (req: Request, res: Response) => {
  const t = getT(req);
  const { BookingSlotOverride } = await getTenantModels(req);

  const overrides = await BookingSlotOverride.find({
    tenant: req.tenant,
  }).sort("-date");

  res.status(200).json({
    success: true,
    overrides, // Slice doğrudan 'overrides' bekliyor!
    message: t("slot.override.listed", "All slot overrides listed."),
  });
});

/**
 * 3️⃣ PUBLIC: Seçili Tarih için Uygun Slotlar
 *    GET /bookingslot?date=YYYY-MM-DD
 */
export const getAvailableSlotsPublic = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;
  const t = getT(req);
  const { BookingSlotRule, BookingSlotOverride, Booking } = await getTenantModels(req);

  if (!date || typeof date !== "string") {
    res.status(400).json({ success: false, message: t("slot.error.noDate", "Date param is required.") });
    return;
  }

  const dayOfWeek = dayjs(date).day();

  // 1️⃣ Kuralları bul
  let rule = await BookingSlotRule.findOne({
    dayOfWeek,
    isActive: true,
    tenant: req.tenant,
  });
  if (!rule) {
    rule = await BookingSlotRule.findOne({
      appliesToAll: true,
      isActive: true,
      tenant: req.tenant,
    });
  }
  if (!rule) {
    res.status(200).json({
      success: true,
      slots: [],
      message: t("slot.noRule", "No working rule found for this day."),
    });
    return;
  }

  // 2️⃣ Override: Tam gün kapalı mı?
  const override = await BookingSlotOverride.findOne({
    date,
    tenant: req.tenant,
  });
  if (override?.fullDayOff) {
    res.status(200).json({
      success: true,
      slots: [],
      message: t("slot.fullDayOff", "This date is fully closed."),
    });
    return;
  }

  // 3️⃣ Tüm slotları oluştur
  const availableSlots: string[] = [];
  const interval = rule.intervalMinutes;
  const breakTime = rule.breakBetweenAppointments;
  let current = dayjs(`${date}T${rule.startTime}`);
  const end = dayjs(`${date}T${rule.endTime}`);

  // Esnek: < end için mi, <= end için mi?
  while (current.add(interval, "minute").isSameOrBefore(end)) {
    const time = current.format("HH:mm");
    availableSlots.push(time);
    current = current.add(interval + breakTime, "minute");
  }

  // 4️⃣ O günün onaylı randevuları ve disabled times
  const confirmedBookings = await Booking.find({
    date,
    tenant: req.tenant,
    status: "confirmed",
  }).select("time durationMinutes");

  const bookedTimes = new Set<string>();
  confirmedBookings.forEach((b) => bookedTimes.add(b.time));
  const disabledTimes = new Set(override?.disabledTimes || []);

  // 5️⃣ Booked ve disabled olanları çıkar
  const finalSlots = availableSlots.filter(
    (slot) => !bookedTimes.has(slot) && !disabledTimes.has(slot)
  );

  res.status(200).json({
    success: true,
    slots: finalSlots,
    message: t("slot.availableListed", "Available slots for selected date."),
  });
});
