import { Request, Response } from "express";
import logger from "@/core/middleware/logger/logger";
import { ensureTenant, validateRange, validateGroupBy } from "./dashboard.validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { Model, PipelineStage } from "mongoose";

/**
 * /stats – Dinamik (ModuleSetting + ModuleMeta) zaman serileri
 * - Dashboard’da gösterilecek modülleri (showInDashboard && enabled!=false) esas alır.
 * - Her modül için ModuleMeta.statsKey → (model/date/value/agg/match) belirlenir.
 * - Yoksa modül adına göre mantıklı varsayılan kullanılır.
 * - Dönen veri: { groupBy, range, labels, series[{key,label,yAxisID,points[{date,value}]}] }
 */

type SeriesPoint = { date: Date; value: number };
type Series = { key: string; label: string; yAxisID?: "y" | "y2"; points: SeriesPoint[] };

type StatAgg = "sum" | "count";
type StatSpec = {
  moduleName: string;
  modelKey: keyof Awaited<ReturnType<typeof getTenantModels>>;
  dateField: string;
  agg: StatAgg;
  valueField?: string;
  valueExpr?: any;
  match?: Record<string, any>;
  yAxisID?: "y" | "y2";
  label?: string;
};

const asModel = <T = any>(m: unknown) => m as Model<T>;

/** Invoice totals expr: grand → total → gross → net → total(field) → 0 */
const INVOICE_TOTAL_EXPR = {
  $ifNull: [
    "$totals.grand",
    {
      $ifNull: [
        "$totals.total",
        {
          $ifNull: [
            "$totals.gross",
            { $ifNull: ["$totals.net", { $ifNull: ["$total", 0] }] },
          ],
        },
      ],
    },
  ],
};

/** statsKey parser: JSON veya key=val;... */
function parseStatsKey(raw?: string): Partial<StatSpec> | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // JSON
  try {
    if (
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]"))
    ) {
      const o = JSON.parse(s);
      const out: Partial<StatSpec> = {};
      if (o.model) out.modelKey = o.model;
      if (o.date) out.dateField = o.date;
      if (o.value) out.valueField = o.value;
      if (o.agg) out.agg = o.agg;
      if (o.match) out.match = o.match;
      return out;
    }
  } catch {
    /* ignore */
  }

  // key=val;key2=val2
  if (s.includes("=") && s.includes(";")) {
    const out: any = {};
    const parts = s.split(";").map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const [k, v] = p.split("=").map((x) => x?.trim());
      if (!k) continue;
      if (k.startsWith("match.")) {
        const mk = k.slice(6);
        out.match = out.match || {};
        out.match[mk] = coerceScalar(v);
      } else {
        out[k] = coerceScalar(v);
      }
    }
    if (out.model) out.modelKey = out.model;
    if (out.date) out.dateField = out.date;
    if (out.value) out.valueField = out.value;
    return out;
  }

  // "payment.amount" gibi basit ifade
  if (s.includes(".")) {
    const [m, value] = s.split(".");
    return { modelKey: toModelKey(m), valueField: value, agg: "sum" };
  }

  return null;
}

function coerceScalar(v?: string) {
  if (v == null) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  const n = Number(v);
  if (!isNaN(n) && v.trim() !== "") return n;
  return v;
}

/** "payments" → "Payment", "timetracking" → "TimeEntry", ... */
function toModelKey(moduleName: string): any {
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
  return (map[moduleName?.toLowerCase()] || capitalize(moduleName));
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Modül için mantıklı varsayılan spec */
function defaultSpecForModule(moduleName: string): Partial<StatSpec> {
  const m = moduleName.toLowerCase();
  if (m === "payments")
    return {
      modelKey: "Payment" as any,
      dateField: "date",
      agg: "sum",
      valueField: "amount",
      yAxisID: "y",
    };
  if (m === "expenses")
    return {
      modelKey: "Expense" as any,
      dateField: "date",
      agg: "sum",
      valueField: "amount",
      yAxisID: "y",
    };
  if (m === "timetracking")
    return {
      modelKey: "TimeEntry" as any,
      dateField: "date",
      agg: "sum",
      valueField: "minutes",
      yAxisID: "y2",
    };
  if (m === "operationsjobs")
    return {
      modelKey: "OperationJob" as any,
      dateField: "date",
      agg: "count",
      match: { /* status: "done" */ },
      yAxisID: "y2",
    };
  if (m === "invoicing")
    return {
      modelKey: "Invoice" as any,
      dateField: "issueDate",
      agg: "sum",
      yAxisID: "y",
    };
  if (m === "orders")
    return {
      modelKey: "Order" as any,
      dateField: "createdAt",
      agg: "sum",
      valueField: "total",
      yAxisID: "y",
    };
  if (m === "booking")
    return { modelKey: "Booking" as any, dateField: "date", agg: "count", yAxisID: "y2" };

  // generic
  return {
    modelKey: toModelKey(moduleName) as any,
    dateField: "updatedAt",
    agg: "count",
    yAxisID: "y2",
  };
}

/** $dateTrunc helper */
function dateGroupExpr(groupBy: "day" | "week" | "month") {
  return { $dateTrunc: { date: "$_date", unit: groupBy } };
}

/** Pipeline üret */
function buildPipeline(
  tenant: string,
  spec: StatSpec,
  groupBy: "day" | "week" | "month",
  range: { from: Date; to: Date }
): PipelineStage[] {
  const match: any = { tenant, ...(spec.match || {}) };
  const dateField = spec.dateField || "updatedAt";

  const stages: PipelineStage[] = [
    // tarih aralığını doğrudan orijinal alan üzerinde uygula
    { $match: { ...match, [dateField]: { $gte: range.from, $lte: range.to } } },
    { $addFields: { _date: `$${dateField}` } },
  ];

  if (spec.agg === "sum") {
    if (spec.modelKey === "Invoice" || spec.valueExpr) {
      stages.push({ $addFields: { _value: spec.valueExpr || INVOICE_TOTAL_EXPR } });
    } else {
      stages.push({ $addFields: { _value: `$${spec.valueField || "amount"}` } });
    }
    stages.push(
      { $group: { _id: dateGroupExpr(groupBy), value: { $sum: "$_value" } } },
      { $project: { date: "$_id", value: 1, _id: 0 } },
      { $sort: { date: 1 } }
    );
  } else {
    stages.push(
      { $group: { _id: dateGroupExpr(groupBy), value: { $sum: 1 } } },
      { $project: { date: "$_id", value: 1, _id: 0 } },
      { $sort: { date: 1 } }
    );
  }
  return stages;
}

/** --- Controller --- */
export async function getDashboardStats(req: Request, res: Response) {
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

  const r = validateRange(req.query as any);
  if ("error" in r) {
    res.status(422).json({ success: false, message: r.error });
    return;
  }

  const g = validateGroupBy((req.query as any).groupBy);
  if ("error" in g) {
    res.status(422).json({ success: false, message: g.error });
    return;
  }

  // İsteğe bağlı modül filtresi
  const include = String(req.query.include || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const models = await getTenantModels(req);
    const { ModuleSetting, ModuleMeta } = models;

    // 1) Dashboard’da görünecek modüller
    const settingQuery: any = { tenant, showInDashboard: true, enabled: { $ne: false } };
    let settings = await ModuleSetting.find(settingQuery).select("module tenant enabled showInDashboard").lean();
    if (include.length) {
      settings = settings.filter((s: any) => include.includes(String(s.module)));
    }

    const moduleNames: string[] = settings.map((s: any) => String(s.module));
    if (!moduleNames.length) {
      res.status(200).json({
        success: true,
        message: t("dashboard.stats.empty", "No modules configured for stats"),
        data: { groupBy: g.groupBy, range: r.range, labels: [], series: [] },
      });
      return;
    }

    // 2) Meta’ları yükle
    const metas = await ModuleMeta.find({ tenant, name: { $in: moduleNames } })
      .select("name label statsKey")
      .lean();

    // 3) Her modül için spec ve aggregate
    const series: Series[] = [];
    for (const modName of moduleNames) {
      const meta = metas.find((m: any) => String(m.name) === modName);
      const humanLabel =
        meta?.label?.[locale] ||
        meta?.label?.en ||
        meta?.label?.tr ||
        modName;

      const parsed = parseStatsKey(meta?.statsKey);
      const defaults = defaultSpecForModule(modName);

      const rawModelKey =
        (parsed?.modelKey as any) ||
        (defaults.modelKey as any) ||
        toModelKey(modName);
      const modelKey = String(rawModelKey) as keyof Awaited<
        ReturnType<typeof getTenantModels>
      >;

      const model = (models as any)[modelKey] as Model<any> | undefined;
      if (!model || typeof model.aggregate !== "function") {
        // model yoksa atla
        continue;
      }

      const dateField =
        (parsed?.dateField as string) ||
        (defaults.dateField as string) ||
        "updatedAt";
      const agg =
        (parsed?.agg as StatAgg) || (defaults.agg as StatAgg) || "count";
      const valueField =
        (parsed?.valueField as string) ||
        (defaults.valueField as string) ||
        undefined;
      const valueExpr =
        (defaults.modelKey === "Invoice" && !valueField)
          ? INVOICE_TOTAL_EXPR
          : undefined;

      const spec: StatSpec = {
        moduleName: modName,
        modelKey,
        dateField,
        agg,
        valueField,
        valueExpr,
        match: parsed?.match || defaults.match,
        yAxisID: (defaults.yAxisID || (agg === "count" ? "y2" : "y")) as
          | "y"
          | "y2",
        label: humanLabel,
      };

      const pipeline = buildPipeline(tenant, spec, g.groupBy, r.range);
      const data = await model.aggregate(pipeline);

      series.push({
        key: modName,
        label: humanLabel,
        yAxisID: spec.yAxisID,
        points: (data as any[]).map((d) => ({
          date: new Date(d.date),
          value: Number(d.value || 0),
        })),
      });
    }

    // 4) Ortak label ekseni (isteğe bağlı – FE için kolaylık)
    const labelSet = new Set<string>();
    for (const s of series) for (const p of s.points) labelSet.add(p.date.toISOString());
    const labels = Array.from(labelSet).sort();

    res.status(200).json({
      success: true,
      message: translate("dashboard.stats.success", locale, translations),
      data: {
        groupBy: g.groupBy,
        range: { from: r.range.from, to: r.range.to },
        labels,
        series,
      },
    });

    logger.withReq.info(req, "[DASHBOARD] stats dynamic ok", {
      module: "dashboard",
      event: "stats.dynamic.ok",
      tenant,
      groupBy: g.groupBy,
      range: { from: r.range.from.toISOString(), to: r.range.to.toISOString() },
      seriesCount: series.length,
      modules: moduleNames,
      include,
      context: getRequestContext(req),
      tookMs: Date.now() - startedAt,
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[DASHBOARD] stats dynamic fail", {
      module: "dashboard",
      event: "stats.dynamic.fail",
      tenant,
      error: err?.message,
      stack: err?.stack,
      context: getRequestContext(req),
    });
    res.status(500).json({ success: false, message: "dashboard.stats.error" });
    return;
  }
}
