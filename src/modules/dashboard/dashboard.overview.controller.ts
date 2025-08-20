import { Request, Response } from "express";
import logger from "@/core/middleware/logger/logger";
import { ensureTenant, validateRange } from "./dashboard.validation";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { Model, FilterQuery } from "mongoose";

/**
 * Dinamik Overview:
 * - ModuleSetting(showInDashboard:true, enabled!=false) → hangi modüller dahil?
 * - Her modül için uygun özet metrik (count/sum) + finans (revenue/expenses/net)
 * - "latest" feed: dahil modüllerden son kayıtlar (module bazlı sıralama alanıyla)
 * - Model yoksa/hata olursa atla; 200 OK döndür.
 */

type Counters = Record<string, number>;
type Finance = { revenue: number; expenses: number; net: number };

type LeanDoc = Record<string, any>;
type LatestItem = {
  ts: Date | string | number | null;
  type: string;      // module name (e.g. payments)
  module: string;    // model key (e.g. payment)
  title?: string;
  status?: string;
  amount?: number;
  currency?: string;
  refId: string;
};

const asModel = <T = any>(m: unknown) => m as Model<T>;

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function startOfToday() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}
function endOfToday() {
  const d = new Date(); d.setHours(23,59,59,999); return d;
}
function get<T = any>(obj: any, path: string, d?: T): T | undefined {
  try { return path.split(".").reduce((a,k)=>a==null?a:a[k], obj) ?? d; } catch { return d; }
}
function pickTitle(doc: any, locale: string) {
  const cands = [
    get<string>(doc, "title."+locale),
    get<string>(doc, "label."+locale),
    doc.title, doc.name, doc.subject, doc.code, doc.filename, doc.fullName,
  ].filter(Boolean);
  const first = cands.find(x => String(x).trim() !== "");
  if (first) return String(first);
  const loc = get<any>(doc,"title") || get<any>(doc,"label");
  if (loc && typeof loc==="object") return (loc[locale] || loc.en || loc.tr || Object.values(loc)[0]) as string;
  return undefined;
}
function pickInvoiceAmount(inv: any): number {
  const t = inv?.totals || {};
  return (t.grand ?? t.total ?? t.gross ?? t.net ?? inv?.total ?? 0) || 0;
}
function pickInvoiceCurrency(inv: any): string {
  return inv?.currency || inv?.totals?.currency || "TRY";
}
function pickAmountGeneric(doc: any, modelKey?: string): number | undefined {
  if (modelKey === "Invoice") return pickInvoiceAmount(doc);
  const nums = [doc.amount, doc.total, doc.rating, doc.minutes, doc.size]
    .map((x) => (typeof x === "number" ? x : Number(x)))
    .filter((n) => !isNaN(n));
  return nums[0];
}
function toModelKey(moduleName: string): keyof Awaited<ReturnType<typeof getTenantModels>> {
  const map: Record<string,string> = {
    payments: "Payment",
    expenses: "Expense",
    invoicing: "Invoice",
    operationsjobs: "OperationJob",
    timetracking: "TimeEntry",
    scheduling: "SchedulePlan",
    contracts: "Contract",
    orders: "Order",
    booking: "Booking",
    email: "EmailMessage",
    notification: "Notification",
    comment: "Comment",
    review: "Review",
    contacts: "Contact",
    contact: "ContactMessage",
    files: "FileObject",
    apartment: "Apartment",
    employees: "Employee",
  };
  const key = map[moduleName?.toLowerCase()] || capitalize(moduleName);
  return key as any;
}
function capitalize(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function defaultDateField(moduleName: string, modelKey: string): string {
  const m = moduleName.toLowerCase();
  if (m==="payments" || m==="expenses" || m==="timetracking" || m==="booking") return "date";
  if (modelKey==="Invoice") return "issueDate";
  return "updatedAt";
}
function defaultSortFieldForLatest(moduleName: string, modelKey: string): string {
  const m = moduleName.toLowerCase();
  if (m==="payments" || m==="expenses" || m==="booking") return "date";
  if (modelKey==="Invoice") return "updatedAt";
  return "updatedAt";
}
function defaultSelect(extra: string[] = []) {
  const base = [
    "_id","createdAt","updatedAt","status","title","name","subject","date",
    "amount","total","totals","currency","code","filename","minutes","rating","type","method"
  ];
  return [...new Set([...base, ...extra])].join(" ");
}

export async function getDashboardOverview(req: Request, res: Response) {
  const startedAt = Date.now();
  const locale: SupportedLocale = (req as any).locale || "en";
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const tenant = ensureTenant(req);
  if (!tenant) {
    logger.withReq.warn(req, "[DASHBOARD] tenant missing on request", {
      module: "dashboard",
      event: "tenant.missing",
    });
    res.status(404).json({ success: false, message: "tenant.resolve.fail" });
    return;
  }

  // Range + latestLimit
  const v = validateRange(req.query as any);
  if ("error" in v) {
    res.status(422).json({ success: false, message: v.error });
    return;
  }
  const { range } = v;
  const latestLimit = Math.max(5, Math.min(50, Number(req.query.latestLimit ?? 10)));

  const reqCtx = getRequestContext(req);

  try {
    const models = await getTenantModels(req);
    const { ModuleSetting, ModuleMeta } = models;

    // 1) Dashboard’da görünecek modüller (tenant bazlı)
    const settingQuery: any = { tenant, showInDashboard: true, enabled: { $ne: false } };
    const settings = await ModuleSetting.find(settingQuery).select("module tenant").lean();
    const moduleNames: string[] = settings.map((s: any) => String(s.module));

    // yoksa boş veri
    if (!moduleNames.length) {
      res.status(200).json({
        success: true,
        message: t("dashboard.overview.empty", { count: 0 }),
        data: { counters: {}, finance: { revenue: 0, expenses: 0, net: 0 }, latest: { events: [], limit: latestLimit } },
      });
      logger.withReq.info(req, "[DASHBOARD] overview ok (no modules)", {
        module: "dashboard",
        event: "overview.ok.empty",
        tenant,
        tookMs: Date.now() - startedAt,
        context: reqCtx,
      });
      return;
    }

    const metas = await ModuleMeta.find({ tenant, name: { $in: moduleNames } })
      .select("name label statsKey")
      .lean();

    // 2) COUNTERS + FINANCE
    const counters: Counters = {};
    const finance: Finance = { revenue: 0, expenses: 0, net: 0 };
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    await Promise.all(moduleNames.map(async (modName) => {
      const modelKey = toModelKey(modName);
      const m = asModel<any>((models as any)[modelKey]);
      if (!m || typeof m.countDocuments !== "function") return;

      const dateField = defaultDateField(modName, String(modelKey));
      const baseMatch: FilterQuery<any> = { tenant };

      // Modül bazlı default counter davranışları
      try {
        if (modelKey === "Payment") {
          // revenue (range)
          const r = await m.aggregate([
            { $match: { ...baseMatch, [dateField]: { $gte: range.from, $lte: range.to } } },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
            { $project: { _id: 0, amount: 1 } },
          ]);
          finance.revenue += Number(r[0]?.amount || 0);
          counters["payments.sum"] = (counters["payments.sum"] || 0) + Number(r[0]?.amount || 0);
        } else if (modelKey === "Expense") {
          // expenses (range)
          const r = await m.aggregate([
            { $match: { ...baseMatch, [dateField]: { $gte: range.from, $lte: range.to } } },
            { $group: { _id: null, amount: { $sum: "$amount" } } },
            { $project: { _id: 0, amount: 1 } },
          ]);
          finance.expenses += Number(r[0]?.amount || 0);
          counters["expenses.sum"] = (counters["expenses.sum"] || 0) + Number(r[0]?.amount || 0);
        } else if (modelKey === "Invoice") {
          // overdue count (sent & dueDate<now) + status=overdue
          const overdue = await m.countDocuments({
            ...baseMatch,
            $or: [{ status: "overdue" }, { status: "sent", dueDate: { $lt: new Date() } }],
          });
          counters["invoicing.overdue"] = overdue;
        } else if (modelKey === "OperationJob") {
          // today planned jobs
          const todayPlanned = await m.countDocuments({
            ...baseMatch,
            date: { $gte: todayStart, $lte: todayEnd },
          });
          counters["operationsjobs.today"] = todayPlanned;
        } else if (modelKey === "TimeEntry") {
          // minutes in range (or last 7d? → range'e uyduk)
          const r = await m.aggregate([
            { $match: { ...baseMatch, [dateField]: { $gte: range.from, $lte: range.to } } },
            { $group: { _id: null, minutes: { $sum: "$minutes" } } },
            { $project: { _id: 0, minutes: 1 } },
          ]);
          counters["timetracking.minutes"] = Number(r[0]?.minutes || 0);
        } else if (modelKey === "Contract") {
          const active = await m.countDocuments({ ...baseMatch, status: "active" });
          counters["contracts.active"] = active;
        } else if (modelKey === "Apartment") {
          const cnt = await m.countDocuments({ ...baseMatch });
          counters["apartments.count"] = cnt;
        } else if (modelKey === "Employee") {
          const active = await m.countDocuments({ ...baseMatch, isActive: true });
          counters["employees.active"] = active;
        } else if (modelKey === "Order") {
          const r = await m.aggregate([
            { $match: { ...baseMatch, createdAt: { $gte: range.from, $lte: range.to } } },
            { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
            { $project: { _id: 0, total: 1, count: 1 } },
          ]);
          counters["orders.count"] = Number(r[0]?.count || 0);
          counters["orders.sum"] = Number(r[0]?.total || 0);
        } else if (modelKey === "Booking") {
          const upcoming = await m.countDocuments({
            ...baseMatch,
            date: { $gte: todayStart },
          });
          counters["booking.upcoming"] = upcoming;
        } else {
          // generic count in range by dateField if present, else all
          const hasDate = ["date","createdAt","updatedAt","issueDate"].includes(dateField);
          const match = hasDate ? { ...baseMatch, [dateField]: { $gte: range.from, $lte: range.to } } : baseMatch;
          const cnt = await m.countDocuments(match);
          counters[`${String(modName)}.count`] = (counters[`${String(modName)}.count`] || 0) + cnt;
        }
      } catch (e: any) {
        // ignore per-module failure
      }
    }));

    finance.net = finance.revenue - finance.expenses;

    // 3) LATEST (tüm seçili modüllerden, birleşik feed)
    const latestEvents: LatestItem[] = [];
    await Promise.all(moduleNames.map(async (modName) => {
      const modelKey = toModelKey(modName);
      const raw = (models as any)[modelKey];
      if (!raw || typeof raw.find !== "function") return;
      const m = asModel<any>(raw);
      const sortField = defaultSortFieldForLatest(modName, String(modelKey));
      const select = defaultSelect([sortField]);

      const docs = (await m
        .find({ tenant })
        .select(select)
        .sort({ [sortField]: -1 } as any)
        .limit(latestLimit)
        .lean()
        .exec()) as unknown as LeanDoc[];

      for (const d of docs) {
        // ts
        const ts = ((): Date | null => {
          const v = d[sortField] || d.updatedAt || d.createdAt || d.date;
          if (!v) return null;
          const dd = v instanceof Date ? v : new Date(v);
          return isNaN(dd.getTime()) ? null : dd;
        })();

        // amount/currency mapping
        const amount = pickAmountGeneric(d, String(modelKey));
        const currency = modelKey === "Invoice" ? pickInvoiceCurrency(d) : (d.currency || "TRY");

        latestEvents.push({
          ts,
          type: modName,
          module: String(modelKey).toLowerCase(),
          title: pickTitle(d, locale),
          status: d.status || d.type,
          amount: typeof amount === "number" ? amount : undefined,
          currency,
          refId: String(d._id),
        });
      }
    }));

    // tekleştir/sırala ve ilk latestLimit kadarını al (tüm modüllerden birleşik)
    const mergedLatest = latestEvents
      .filter((e) => !!e.ts)
      .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
      .slice(0, latestLimit);

    res.status(200).json({
      success: true,
      message: t("dashboard.overview.success", { cards: Object.keys(counters).length, latest: mergedLatest.length }),
      data: {
        counters,
        finance,
        latest: { events: mergedLatest, limit: latestLimit },
      },
    });

    logger.withReq.info(req, "[DASHBOARD] overview dynamic ok", {
      module: "dashboard",
      event: "overview.dynamic.ok",
      tenant,
      tookMs: Date.now() - startedAt,
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      countersKeys: Object.keys(counters),
      finance,
      latest: mergedLatest.length,
      modules: moduleNames,
      context: reqCtx,
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[DASHBOARD] overview dynamic fail", {
      module: "dashboard",
      event: "overview.dynamic.fail",
      tenant,
      error: err?.message,
      stack: err?.stack,
      context: reqCtx,
    });
    res.status(500).json({ success: false, message: "dashboard.overview.error" });
    return;
  }
}
