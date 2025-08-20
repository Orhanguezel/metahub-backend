import { Request, Response } from "express";
import logger from "@/core/middleware/logger/logger";
import { ensureTenant, validateRange, validateGroupBy } from "./dashboard.validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { Model, PipelineStage } from "mongoose";

/** ---- Yardımcı tipler ---- */
type StatAgg = "sum" | "count";
type StatSpec = {
  moduleName: string;                // modules klasör adı (örn: payments)
  modelKey: keyof Awaited<ReturnType<typeof getTenantModels>>; // getTenantModels içindeki model anahtarı (örn: "Payment")
  dateField: string;                 // "date" | "createdAt" | "issueDate" ...
  agg: StatAgg;                      // "sum" | "count"
  valueField?: string;               // agg=sum için zorunlu (örn: "amount", "minutes")
  valueExpr?: any;                   // Invoice gibi özel: {$ifNull:[...]}
  match?: Record<string, any>;       // ek filtre (örn: { status:"done" })
  yAxisID?: "y" | "y2";              // Chart.js ekseni – para y, adet/dakika y2
  label?: string;                    // grafikte gösterilecek label
};

const asModel = <T = any>(m: unknown) => m as Model<T>;

/** statsKey parser: JSON veya key=val;... şeklini destekler.
 *  Örnekler:
 *   - {"model":"Payment","date":"date","value":"amount","agg":"sum","match":{"status":"ok"}}
 *   - model=Payment;date=date;value=amount;agg=sum;match.status=ok
 *   - payment.amount   -> model=Payment, value=amount, date (tahmin)
 */
function parseStatsKey(raw?: string): Partial<StatSpec> | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // 1) JSON
  try {
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      const o = JSON.parse(s);
      const out: Partial<StatSpec> = {};
      if (o.model) out.modelKey = o.model;
      if (o.date) out.dateField = o.date;
      if (o.value) out.valueField = o.value;
      if (o.agg) out.agg = o.agg;
      if (o.match) out.match = o.match;
      return out;
    }
  } catch { /* ignore */ }

  // 2) key=val;key2=val2
  if (s.includes("=") && s.includes(";")) {
    const out: any = {};
    const parts = s.split(";").map(p => p.trim()).filter(Boolean);
    for (const p of parts) {
      const [k, v] = p.split("=").map(x => x?.trim());
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

  // 3) "payment.amount" gibi basit kısım
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

/** "payments" -> "Payment", "timetracking" -> "TimeEntry", "invoicing" -> "Invoice" ... */
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
    contacts: "Contact",             // master data
    contact: "ContactMessage",       // mesaj kutusu
    files: "FileObject",
    apartment: "Apartment",
    employees: "Employee",
    // genişletebilirsin...
  };
  return (map[moduleName?.toLowerCase()] || capitalize(moduleName));
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Module adı için mantıklı varsayılan spec */
function defaultSpecForModule(moduleName: string): Partial<StatSpec> {
  const m = moduleName.toLowerCase();
  if (m === "payments") return { modelKey: "Payment" as any, dateField: "date", agg: "sum", valueField: "amount", yAxisID: "y" };
  if (m === "expenses") return { modelKey: "Expense" as any, dateField: "date", agg: "sum", valueField: "amount", yAxisID: "y" };
  if (m === "timetracking") return { modelKey: "TimeEntry" as any, dateField: "date", agg: "sum", valueField: "minutes", yAxisID: "y2" };
  if (m === "operationsjobs") return { modelKey: "OperationJob" as any, dateField: "date", agg: "count", match: { /* status: "done" */ }, yAxisID: "y2" };
  if (m === "invoicing") {
    // Invoice totals: özel expr
    return {
      modelKey: "Invoice" as any,
      dateField: "issueDate",       // yoksa createdAt’a düşeriz
      agg: "sum",
      yAxisID: "y",
      // valueExpr pipeline içinde set edilecek
    };
  }
  if (m === "orders") return { modelKey: "Order" as any, dateField: "createdAt", agg: "sum", valueField: "total", yAxisID: "y" };
  if (m === "booking") return { modelKey: "Booking" as any, dateField: "date", agg: "count", yAxisID: "y2" };
  return { modelKey: toModelKey(moduleName) as any, dateField: "updatedAt", agg: "count", yAxisID: "y2" };
}

/** Invoice için totals expr (grand → total → gross → net → total field → 0) */
const INVOICE_TOTAL_EXPR = {
  $ifNull: [
    "$totals.grand",
    { $ifNull: [
      "$totals.total",
      { $ifNull: [
        "$totals.gross",
        { $ifNull: [
          "$totals.net",
          { $ifNull: ["$total", 0] }
        ]}
      ]}
    ]}
  ]
};

/** Tarihi $dateTrunc ile gruplamak için helper */
function dateGroupExpr(groupBy: "day"|"week"|"month") {
  return { $dateTrunc: { date: "$_date", unit: groupBy } };
}

/** Verilen spec için aggregate pipeline üretir */
function buildPipeline(tenant: string, spec: StatSpec, groupBy: "day"|"week"|"month"): PipelineStage[] {
  // tarih alanı yoksa createdAt/updatedAt fallback’i proje içinde yapılır
  const match: any = { tenant };
  const dateField = spec.dateField || "updatedAt";

  // API seviyesinde tarih aralığı zaten $match ile gelmiyor — controller’dan eklenecek
  // burada yalnız tenant + opsiyonel match ekleyelim
  if (spec.match && typeof spec.match === "object") {
    Object.assign(match, spec.match);
  }

  const stages: PipelineStage[] = [
    { $match: match },
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
  } else { // count
    stages.push(
      { $group: { _id: dateGroupExpr(groupBy), value: { $sum: 1 } } },
      { $project: { date: "$_id", value: 1, _id: 0 } },
      { $sort: { date: 1 } }
    );
  }

  return stages;
}

/** --- DİNAMİK CHARTS ENDPOINT --- */
export async function getDashboardCharts(req: Request, res: Response) {
  const startedAt = Date.now();
  const locale: SupportedLocale = (req as any).locale || "en";
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  const tenant = ensureTenant(req);
  if (!tenant) {
    logger.withReq.warn(req, "[DASHBOARD] tenant missing on request", { module: "dashboard", event: "tenant.missing" });
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

  // isteğe bağlı: include=payments,expenses gibi modül filtrelemesi
  const include = String(req.query.include || "")
    .split(",").map(s => s.trim()).filter(Boolean);

  try {
    const { ModuleSetting, ModuleMeta } = await getTenantModels(req);
    const models = await getTenantModels(req);

    // 1) Dashboard’da gösterilecek modülleri ayıkla (tenant’a göre)
    const settingQuery: any = { tenant, showInDashboard: true };
    // enabled=false olanları atla; undefined ise kabul edelim
    settingQuery.enabled = { $ne: false };

    let settings = await ModuleSetting.find(settingQuery).select("module tenant enabled showInDashboard").lean();
    if (include.length) {
      settings = settings.filter(s => include.includes(String(s.module)));
    }

    // hiç modül yoksa boş dataset dön
    if (!settings.length) {
      res.status(200).json({
        success: true,
        message: t("dashboard.charts.noModules", "No modules configured for dashboard"),
        data: { labels: [], datasets: [] },
      });
      return;
    }

    // 2) Meta’ları çek ve spec’leri oluştur
    const moduleNames = settings.map(s => String(s.module));
    const metas = await ModuleMeta.find({ tenant, name: { $in: moduleNames } }).lean();

    // seri başına sonuçlar
    const series: { key: string; label: string; yAxisID?: "y"|"y2"; data: { date: Date; value: number }[] }[] = [];

    for (const modName of moduleNames) {
      const meta = metas.find(m => String(m.name) === modName);
      const humanLabel =
        meta?.label?.[locale] ||
        meta?.label?.en ||
        meta?.label?.tr ||
        modName;

      // Meta.statsKey‘yi oku (JSON/k=vs) ve default ile birleşir
      const parsed = parseStatsKey(meta?.statsKey);
      const defaults = defaultSpecForModule(modName);

      // modelKey string olabilir; getTenantModels key’ine uyarla
      const rawModelKey = (parsed?.modelKey as any) || (defaults.modelKey as any) || toModelKey(modName);
      const modelKey = String(rawModelKey) as keyof Awaited<ReturnType<typeof getTenantModels>>;

      const model = (models as any)[modelKey] as Model<any> | undefined;
      if (!model || typeof model.aggregate !== "function") {
        // model yok → skip
        continue;
      }

      const dateField = (parsed?.dateField as string) || (defaults.dateField as string) || "updatedAt";
      const agg = (parsed?.agg as StatAgg) || (defaults.agg as StatAgg) || "count";
      const valueField = (parsed?.valueField as string) || (defaults.valueField as string) || undefined;
      const valueExpr = (defaults.modelKey === "Invoice" && !valueField) ? INVOICE_TOTAL_EXPR : undefined;

      const spec: StatSpec = {
        moduleName: modName,
        modelKey,
        dateField,
        agg,
        valueField,
        valueExpr,
        match: parsed?.match || defaults.match,
        yAxisID: (defaults.yAxisID || (agg === "count" ? "y2" : "y")) as ("y"|"y2"),
        label: humanLabel,
      };

      // 3) Pipeline’ı oluştur (tenant filtresi + tarih aralığı)
      const pipe = buildPipeline(tenant, spec, g.groupBy);
      // tarih aralığı match’ini en başa ekleyelim (_date eklenmeden önce orijinal field üzerinden)
      // Pipe’ın 0. stage’i $match; oraya date aralığını inject
      const dateMatchField = spec.dateField || "updatedAt";
      const matchStage = pipe[0] as any;
      matchStage.$match[dateMatchField] = { $gte: r.range.from, $lte: r.range.to };

      // 4) Çalıştır
      const data = await model.aggregate(pipe);

      // 5) Seri ekle
      series.push({
        key: modName,
        label: humanLabel,
        yAxisID: spec.yAxisID,
        data: data.map((d: any) => ({ date: new Date(d.date), value: Number(d.value) || 0 })),
      });
    }

    // 6) Ortak label ekseni oluştur (tüm serilerin tarih birleşimi)
    const labelSet = new Set<string>();
    for (const s of series) for (const p of s.data) labelSet.add(p.date.toISOString());
    const labels = Array.from(labelSet).sort();

    // 7) Chart.js dataset üret
    const datasets = series.map(s => {
      const map = new Map(s.data.map(p => [p.date.toISOString(), p.value]));
      return {
        label: s.label,
        data: labels.map(l => map.get(l) ?? 0),
        ...(s.yAxisID ? { yAxisID: s.yAxisID } : {}),
      };
    });

    res.status(200).json({
      success: true,
      message: translate("dashboard.charts.success", locale, translations),
      data: { labels, datasets },
    });

    logger.withReq.info(req, "[DASHBOARD] charts dynamic ok", {
      module: "dashboard",
      event: "charts.dynamic.ok",
      tenant,
      groupBy: g.groupBy,
      range: { from: r.range.from.toISOString(), to: r.range.to.toISOString() },
      seriesCount: series.length,
      modules: moduleNames,
      context: getRequestContext(req),
      tookMs: Date.now() - startedAt,
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[DASHBOARD] charts dynamic fail", {
      module: "dashboard",
      event: "charts.dynamic.fail",
      tenant,
      error: err?.message,
      stack: err?.stack,
      context: getRequestContext(req),
    });
    res.status(500).json({ success: false, message: "dashboard.charts.error" });
    return;
  }
}
