import { Request } from "express";

/** Allowed groupBy */
const GROUPS = ["day", "week", "month"] as const;
export type GroupBy = typeof GROUPS[number];

export type Range = { from: Date; to: Date };

export interface BaseQuery {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: GroupBy;
  limit?: string | number;
  offset?: string | number;
  tz?: string; // optional, default Europe/Istanbul
}

const TZ_DEFAULT = "Europe/Istanbul";

/** ISO (YYYY-MM-DD) veya ISO datetime kabul eder. */
export function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Tarih aralığı doğrulama + normalizasyon */
export function validateRange(q: BaseQuery): { range: Range; tz: string } | { error: string } {
  const tz = (q.tz && typeof q.tz === "string" ? q.tz : TZ_DEFAULT);

  const to = parseDate(q.dateTo) ?? new Date(); // now
  const from = parseDate(q.dateFrom) ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30d

  if (from > to) return { error: "dashboard.validation.invalidRange" };

  return { range: { from, to }, tz };
}

export function validateGroupBy(groupBy?: string): { groupBy: GroupBy } | { error: string } {
  const g = (groupBy || "day").toLowerCase();
  if (!GROUPS.includes(g as GroupBy)) return { error: "dashboard.validation.invalidGroupBy" };
  return { groupBy: g as GroupBy };
}

export function validatePagination(limit?: string | number, offset?: string | number) {
  const l = Math.max(1, Math.min(100, Number(limit ?? 20)));
  const o = Math.max(0, Number(offset ?? 0));
  return { limit: l, offset: o };
}

/** Request guard: tenant zorunlu */
export function ensureTenant(req: Request): string | null {
  return (req as any).tenant || null;
}

