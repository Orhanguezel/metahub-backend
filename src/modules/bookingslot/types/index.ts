// src/modules/bookingslot/types.ts
import { Document } from "mongoose";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";

export interface IBookingSlotRule extends Document {
  appliesToAll?: boolean;
  tenant: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  breakBetweenAppointments: number;
  isActive: boolean;
  label?: TranslatedLabel;
  description?: TranslatedLabel;
}

export interface IBookingSlotOverride extends Document {
  date: string;
  disabledTimes: string[];
  fullDayOff?: boolean;
  tenant: string;
}
