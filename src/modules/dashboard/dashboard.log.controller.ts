import { Request, Response } from "express";
import logger from "@/core/middleware/logger/logger";
import { ensureTenant, validatePagination } from "./dashboard.validation";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { Model, FilterQuery } from "mongoose";

/** ---- Event tipi ---- */
type LeanDoc = Record<string, any>;
type EventItem = {
  ts: Date | string | number | null;
  type: string;          // module name (e.g., payments)
  module?: string;       // model key (e.g., payment)
  title?: string;
  status?: string;
  amount?: number;
  currency?: string;
  method?: string;
  refId: string;
  extra?: Record<string, any>;
};

/** --- Güvenli yardımcılar --- */
const asModel = <T = any>(m: unknown) => m as Model<T>;

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function get<T = any>(obj: any, path: string, d?: T): T | undefined {
  try {
    return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj) ?? d;
  } catch { return d; }
}
function pickTs(doc: LeanDoc, fields: string[]): Date | null {
  for (const f of fields) {
    const v = get<any>(doc, f);
    if (!v) continue;
    const d = v instanceof Date ? v : new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** Invoice toplamını şemadan bağımsız çıkar (grand→total→gross→net→total) */
function pickInvoiceAmount(inv: any): number {
  const t = inv?.totals || {};
  return (t.grand ?? t.total ?? t.gross ?? t.net ?? inv?.total ?? 0) || 0;
}
function pickInvoiceCurrency(inv: any): string {
  return inv?.currency || inv?.totals?.currency || "TRY";
}

/** Basit string seçici (localized objeler için locale önceliği) */
function pickTitle(doc: any, locale: string): string | undefined {
  const candidates = [
    get<string>(doc, "title." + locale),
    get<string>(doc, "label." + locale),
    doc.title, doc.name, doc.subject, doc.code, doc.filename, doc.fullName,
  ].filter(Boolean);

  const first = candidates.find((x) => typeof x === "string" && x.trim() !== "");
  if (first) return String(first);

  // localized fallback
  const locFallback = get<any>(doc, "title") || get<any>(doc, "label");
  if (locFallback && typeof locFallback === "object") {
    return (locFallback.en || locFallback.tr || Object.values(locFallback)[0]) as string;
  }
  return undefined;
}

/** Sayısal değer (genel): amount→total→rating→minutes→size */
function pickAmountGeneric(doc: any, modelKey?: string): number | undefined {
  if (modelKey === "Invoice") return pickInvoiceAmount(doc);
  const nums = [doc.amount, doc.total, doc.rating, doc.minutes, doc.size]
    .map((x) => (typeof x === "number" ? x : Number(x)))
    .filter((n) => !isNaN(n));
  return nums[0];
}

function pickCurrencyGeneric(doc: any, modelKey?: string): string | undefined {
  if (modelKey === "Invoice") return pickInvoiceCurrency(doc);
  return doc.currency || "TRY";
}

/** Modül adı → getTenantModels içindeki modelKey tahmini */
function toModelKey(moduleName: string): keyof Awaited<ReturnType<typeof getTenantModels>> {
  const map: Record<string, string> = {
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
function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Varsayılan tarih alanı (modül bazlı) */
function defaultDateField(moduleName: string, modelKey: string): string {
  const m = moduleName.toLowerCase();
  if (m === "payments" || m === "expenses" || m === "timetracking") return "date";
  if (m === "booking") return "date";
  if (modelKey === "Invoice") return "issueDate";
  return "updatedAt";
}

/** Varsayılan select (log için minimal alan seti) */
function defaultSelectForLogs(extra: string[] = []) {
  const base = [
    "_id", "updatedAt", "createdAt", "status", "title", "name", "subject",
    "date", "amount", "total", "totals", "currency", "code", "filename",
    "minutes", "rating", "type", "method",
  ];
  return [...new Set([...base, ...extra])].join(" ");
}

/** --- DİNAMİK LOGS ENDPOINT (ModuleSetting + ModuleMeta) --- */
export async function getDashboardLogs(req: Request, res: Response) {
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

  const { limit, offset } = validatePagination(req.query.limit as any, req.query.offset as any);
  const include = String(req.query.include || req.query.types || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const exclude = String(req.query.exclude || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const dateFrom = parseDate(req.query.dateFrom);
  const dateTo = parseDate(req.query.dateTo);

  const reqCtx = getRequestContext(req);

  try {
    const models = await getTenantModels(req);
    const { ModuleSetting, ModuleMeta } = models;

    // 1) Dashboard’da gösterilecek modülleri topla (tenant bazlı)
    const settingQuery: any = { tenant, showInDashboard: true, enabled: { $ne: false } };
    let settings = await ModuleSetting.find(settingQuery).select("module tenant enabled showInDashboard").lean();

    if (include.length) settings = settings.filter((s: any) => include.includes(String(s.module)));
    if (exclude.length) settings = settings.filter((s: any) => !exclude.includes(String(s.module)));

    const moduleNames: string[] = settings.map((s: any) => String(s.module));
    if (!moduleNames.length) {
      res.status(200).json({
        message: t("dashboard.logs.success", { count: 0 }),
        success: true,
        data: { events: [], limit, offset, totalMerged: 0, sourceCounts: {}, skipped: [], errors: {}, appliedFilters: { include, exclude, dateFrom: dateFrom?.toISOString(), dateTo: dateTo?.toISOString() } },
      });
      logger.withReq.info(req, "[DASHBOARD] logs dynamic ok (no modules)", {
        module: "dashboard",
        event: "logs.dynamic.ok.empty",
        tenant,
        tookMs: Date.now() - startedAt,
        context: reqCtx,
      });
      return;
    }

    // 2) Meta’ları çek (label & statsKey’den date alanı ipucu çıkabilir)
    const metas = await ModuleMeta.find({ tenant, name: { $in: moduleNames } })
      .select("name label statsKey")
      .lean();

    const perSourceLimit = Math.min(Math.max(limit, 10), 100);
    const results: EventItem[] = [];
    const counts: Record<string, number> = {};
    const skipped: string[] = [];
    const errors: Record<string, string> = {};

    const tDbStart = Date.now();

    await Promise.all(moduleNames.map(async (modName) => {
      try {
        const meta = metas.find((m: any) => String(m.name) === modName);
        const modelKey = toModelKey(modName);
        const rawModel = (models as any)[modelKey];

        if (!rawModel || typeof rawModel.find !== "function") {
          skipped.push(modName);
          return;
        }

        const m = asModel<any>(rawModel);
        // statsKey içinde "date" varsa kullan; yoksa default
        let dateField = defaultDateField(modName, String(modelKey));
        if (meta?.statsKey) {
          const df = tryParseDateFieldFromStatsKey(meta.statsKey);
          if (df) dateField = df;
        }

        const select = defaultSelectForLogs([dateField]);
        const sortKey = dateField || "updatedAt";
        const q: FilterQuery<any> = { tenant };

        const docs = (await m
          .find(q)
          .select(select)
          .sort({ [sortKey]: -1 } as any)
          .limit(perSourceLimit)
          .lean()
          .exec()) as unknown as LeanDoc[];

        // map to EventItem
        const tsFields = [dateField, "updatedAt", "createdAt", "date"];
        const mapped = docs.map((d) => {
          const ts = pickTs(d, tsFields);
          const item: EventItem = {
            ts,
            type: modName, // module name as type
            module: String(modelKey).toLowerCase(),
            refId: String(d._id),
          };
          // common fields
          item.status = d.status || d.type;
          item.title = pickTitle(d, locale);
          const amt = pickAmountGeneric(d, String(modelKey));
          if (typeof amt === "number") item.amount = amt;
          const cur = pickCurrencyGeneric(d, String(modelKey));
          if (cur) item.currency = cur;
          if (d.method) item.method = d.method;
          item.extra = {};
          return item;
        });

        // tarih aralığı post-filter (varsa)
        const filtered = mapped.filter((e) => {
          if (!e.ts) return false;
          const t = e.ts instanceof Date ? e.ts : new Date(e.ts);
          if (isNaN(t.getTime())) return false;
          if (dateFrom && t < dateFrom) return false;
          if (dateTo && t > (dateTo as Date)) return false;
          return true;
        });

        results.push(...filtered);
        counts[modName] = filtered.length;
      } catch (e: any) {
        errors[modName] = e?.message || "unknown";
      }
    }));

    const dbMs = Date.now() - tDbStart;

    // merge + sort + slice
    const merged = results
      .filter((e) => !!e.ts)
      .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime());
    const sliced = merged.slice(offset, offset + limit);

    res.status(200).json({
      message: t("dashboard.logs.success", { count: sliced.length }),
      success: true,
      data: {
        events: sliced,
        limit,
        offset,
        totalMerged: merged.length,
        sourceCounts: counts,
        skipped,
        errors,
        appliedFilters: {
          include,
          exclude,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        },
      },
    });

    logger.withReq.info(req, "[DASHBOARD] logs endpoint dynamic ok", {
      module: "dashboard",
      event: "logs.dynamic.ok",
      tenant,
      tookMs: Date.now() - startedAt,
      dbMs,
      include,
      exclude,
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
      counts,
      skipped,
      errKeys: Object.keys(errors),
      modules: moduleNames,
      context: reqCtx,
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[DASHBOARD] logs endpoint dynamic fail", {
      module: "dashboard",
      event: "logs.dynamic.fail",
      tenant,
      tookMs: Date.now() - startedAt,
      error: err?.message,
      stack: err?.stack,
      context: reqCtx,
    });
    res.status(500).json({ success: false, message: "dashboard.logs.error" });
    return;
  }
}

/** statsKey içinden date alanını çıkarmayı dener. 
 *  Örnek: {"date":"date"} veya "model=Payment;date=date;..."
 */
function tryParseDateFieldFromStatsKey(raw?: string): string | null {
  if (!raw) return null;
  // JSON
  try {
    if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
      const o = JSON.parse(raw);
      if (typeof o.date === "string" && o.date.trim()) return o.date.trim();
    }
  } catch { /* ignore */ }
  // key=val;
  if (raw.includes("=") && raw.includes(";")) {
    for (const p of raw.split(";")) {
      const [k, v] = p.split("=").map((x) => x?.trim());
      if (k === "date" && v) return v;
    }
  }
  return null;
}
