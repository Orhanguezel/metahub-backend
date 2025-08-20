import type { Range, GroupBy } from "./dashboard.validation";
import logger from "@/core/middleware/logger/logger";
import type { Model, PipelineStage } from "mongoose";

/** ────────────────────────────────────────────────────────────────────────────
 *  Bu dosya ARTIK doğrudan model import ETMİYOR.
 *  Controller'lar getTenantModels(req) ile tenant'a özel modelleri alıp,
 *  buraya enjekte edecek.
 *  ────────────────────────────────────────────────────────────────────────────
 */

export interface DashboardStatsModels {
  // Finans / Operasyon (klasik seriler için gerekli)
  Payment?: Model<any>;
  Expense?: Model<any>;
  OperationJob?: Model<any>;
  TimeEntry?: Model<any>;
  Invoice?: Model<any>;

  // Overview için sık kullanılanlar
  Apartment?: Model<any>;
  Employee?: Model<any>;
  Contract?: Model<any>;

  // Dinamik modül seçimi için (opsiyonel)
  ModuleSetting?: Model<any>;
  ModuleMeta?: Model<any>;

  // Enrichment için (opsiyonel)
  Customer?: Model<any>;

  // Diğer tüm modeller (genişletilebilir)
  [key: string]: any;
}

/** $dateTrunc helper */
function groupDateStage(groupBy: GroupBy) {
  return {
    day: { $dateTrunc: { date: "$_date", unit: "day" } },
    week: { $dateTrunc: { date: "$_date", unit: "week" } },
    month: { $dateTrunc: { date: "$_date", unit: "month" } },
  }[groupBy];
}

/** Invoice total expr (grand → total → gross → net → total(field) → 0) */
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

/** Basit yardımcılar */
const asModel = <T = any>(m: unknown) => m as Model<T>;
const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const endOfToday = () => { const d = new Date(); d.setHours(23,59,59,999); return d; };

/** Modül adı → getTenantModels anahtarı (tahminci) */
function toModelKey(moduleName: string): string {
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
  return map[moduleName?.toLowerCase()] || (moduleName ? moduleName[0].toUpperCase() + moduleName.slice(1) : moduleName);
}

/** Varsayılan tarih alanı (overview/latest için) */
function defaultDateField(moduleName: string, modelKey: string): string {
  const m = moduleName.toLowerCase();
  if (m === "payments" || m === "expenses" || m === "timetracking" || m === "booking") return "date";
  if (modelKey === "Invoice") return "issueDate";
  return "updatedAt";
}

/* ========================================================================== */
/*  OVERVIEW                                                                  */
/* ========================================================================== */

/**
 * getOverview (tenant-aware + enjekte modeller)
 * - counters: apartments, employees(active), contracts(active), invoices(overdue),
 *             plannedJobsToday, timeLast7dMinutes
 * - finance:  revenue(sum payments in range), expenses(sum expenses in range), net
 * Eksik model varsa ilgili metrik 0 döner (hata fırlatmaz).
 */
export async function getOverview(
  tenant: string,
  range: Range,
  models: DashboardStatsModels
) {
  const t0 = Date.now();

  const Apartment = models.Apartment && asModel(models.Apartment);
  const Employee = models.Employee && asModel(models.Employee);
  const Contract = models.Contract && asModel(models.Contract);
  const Invoice = models.Invoice && asModel(models.Invoice);
  const OperationJob = models.OperationJob && asModel(models.OperationJob);
  const TimeEntry = models.TimeEntry && asModel(models.TimeEntry);
  const Payment = models.Payment && asModel(models.Payment);
  const Expense = models.Expense && asModel(models.Expense);

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [
    apartments,
    employees,
    activeContracts,
    overdueInvoices,
    plannedJobsToday,
    timeLast7d,
    revenue,
    expenses,
  ] = await Promise.all([
    Apartment ? Apartment.countDocuments({ tenant }) : 0,
    Employee ? Employee.countDocuments({ tenant, isActive: true }) : 0,
    Contract ? Contract.countDocuments({ tenant, status: "active" }) : 0,
    Invoice
      ? Invoice.countDocuments({
          tenant,
          $or: [{ status: "overdue" }, { status: "sent", dueDate: { $lt: new Date() } }, { status: "sent", dueAt: { $lt: new Date() } }],
        })
      : 0,
    OperationJob
      ? OperationJob.countDocuments({
          tenant,
          date: { $gte: todayStart, $lte: todayEnd },
        })
      : 0,
    TimeEntry
      ? TimeEntry.aggregate([
          { $match: { tenant, date: { $gte: new Date(Date.now() - 7 * 86400000), $lte: new Date() } } },
          { $group: { _id: null, minutes: { $sum: "$minutes" } } },
        ]).then((x) => x[0]?.minutes ?? 0)
      : 0,
    Payment
      ? Payment.aggregate([
          { $match: { tenant, date: { $gte: range.from, $lte: range.to } } },
          { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]).then((x) => x[0]?.amount ?? 0)
      : 0,
    Expense
      ? Expense.aggregate([
          { $match: { tenant, date: { $gte: range.from, $lte: range.to } } },
          { $group: { _id: null, amount: { $sum: "$amount" } } },
        ]).then((x) => x[0]?.amount ?? 0)
      : 0,
  ]);

  const data = {
    counters: {
      apartments,
      employees,
      activeContracts,
      overdueInvoices,
      plannedJobsToday,
      timeLast7dMinutes: timeLast7d,
    },
    finance: {
      revenue,
      expenses,
      net: revenue - expenses,
    },
  };

  logger.info("[DASHBOARD] overview computed", {
    module: "dashboard",
    event: "overview",
    tenant,
    tookMs: Date.now() - t0,
    ...data.counters,
    revenue,
    expenses,
  });

  return data;
}

/* ========================================================================== */
/*  TIME SERIES – KLASİK (geriye uyum)                                        */
/* ========================================================================== */

/**
 * getTimeSeries (legacy/uyumluluk)
 * Klasik 5 seri döner: revenue, expenses, net, jobsDone, timeMinutes
 * Controller, Payment/Expense/OperationJob/TimeEntry modellerini enjekte etmeli.
 */
export async function getTimeSeries(
  tenant: string,
  range: Range,
  groupBy: GroupBy,
  models: Pick<DashboardStatsModels, "Payment" | "Expense" | "OperationJob" | "TimeEntry">
) {
  const t0 = Date.now();
  const Payment = models.Payment && asModel(models.Payment);
  const Expense = models.Expense && asModel(models.Expense);
  const OperationJob = models.OperationJob && asModel(models.OperationJob);
  const TimeEntry = models.TimeEntry && asModel(models.TimeEntry);

  // Boş model varsa sonuç boş seri olsun (hata fırlatma)
  const revenueAgg = Payment
    ? await Payment.aggregate([
        { $match: { tenant, date: { $gte: range.from, $lte: range.to } } },
        { $addFields: { _date: "$date" } },
        { $group: { _id: groupDateStage(groupBy), amount: { $sum: "$amount" } } },
        { $project: { date: "$_id", amount: 1, _id: 0 } },
        { $sort: { date: 1 } },
      ])
    : [];

  const expenseAgg = Expense
    ? await Expense.aggregate([
        { $match: { tenant, date: { $gte: range.from, $lte: range.to } } },
        { $addFields: { _date: "$date" } },
        { $group: { _id: groupDateStage(groupBy), amount: { $sum: "$amount" } } },
        { $project: { date: "$_id", amount: 1, _id: 0 } },
        { $sort: { date: 1 } },
      ])
    : [];

  const jobsAgg = OperationJob
    ? await OperationJob.aggregate([
        { $match: { tenant, date: { $gte: range.from, $lte: range.to }, status: "done" } },
        { $addFields: { _date: "$date" } },
        { $group: { _id: groupDateStage(groupBy), count: { $sum: 1 } } },
        { $project: { date: "$_id", count: 1, _id: 0 } },
        { $sort: { date: 1 } },
      ])
    : [];

  const timeAgg = TimeEntry
    ? await TimeEntry.aggregate([
        { $match: { tenant, date: { $gte: range.from, $lte: range.to } } },
        { $addFields: { _date: "$date" } },
        { $group: { _id: groupDateStage(groupBy), minutes: { $sum: "$minutes" } } },
        { $project: { date: "$_id", minutes: 1, _id: 0 } },
        { $sort: { date: 1 } },
      ])
    : [];

  const data = {
    revenue: revenueAgg,
    expenses: expenseAgg,
    net: mergeSeries(revenueAgg as any[], expenseAgg as any[]),
    jobsDone: jobsAgg,
    timeMinutes: timeAgg,
  };

  logger.info("[DASHBOARD] timeseries computed", {
    module: "dashboard",
    event: "timeseries",
    tenant,
    groupBy,
    tookMs: Date.now() - t0,
  });

  return data;
}

/** net = revenue - expenses (aynı tarih anahtarına göre) */
function mergeSeries(
  revenue: { date: Date; amount: number }[],
  expenses: { date: Date; amount: number }[]
) {
  const map = new Map<string, number>();
  for (const r of revenue) {
    const k = new Date(r.date).toISOString();
    map.set(k, (map.get(k) || 0) + (r.amount || 0));
  }
  for (const e of expenses) {
    const k = new Date(e.date).toISOString();
    map.set(k, (map.get(k) || 0) - (e.amount || 0));
  }
  return Array.from(map.entries())
    .map(([date, amount]) => ({ date: new Date(date), amount }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* ========================================================================== */
/*  LATEST – DİNAMİK (ModuleSetting’e göre)                                   */
/* ========================================================================== */

/**
 * getLatest – dashboard'da gösterilecek modüllerden son kayıtlar (birleşik)
 * - ModuleSetting(showInDashboard && enabled!=false) ile modüller belirlenir
 * - Her modül için makul bir sort/date alanı seçilir
 * - Eksik model varsa atlanır
 */
export async function getLatest(
  tenant: string,
  limit: number,
  models: DashboardStatsModels
) {
  const ModuleSetting = models.ModuleSetting && asModel(models.ModuleSetting);
  if (!ModuleSetting) {
    // fallback: sadece Invoice/Payment/OperationJob ile geriye uyum
    const Invoice = models.Invoice && asModel(models.Invoice);
    const Payment = models.Payment && asModel(models.Payment);
    const OperationJob = models.OperationJob && asModel(models.OperationJob);

    const [invoices, payments, jobs] = await Promise.all([
      Invoice ? Invoice.find({ tenant }).sort({ createdAt: -1 }).limit(limit).lean() : [],
      Payment ? Payment.find({ tenant }).sort({ date: -1 }).limit(limit).lean() : [],
      OperationJob ? OperationJob.find({ tenant }).sort({ date: -1 }).limit(limit).lean() : [],
    ]);
    return { invoices, payments, jobs };
  }

  // Dinamik modüller
  const settings = await ModuleSetting.find({
    tenant,
    showInDashboard: true,
    enabled: { $ne: false },
  })
    .select("module tenant")
    .lean();

  const moduleNames: string[] = settings.map((s: any) => String(s.module));
  const events: Array<{
    ts: Date | null;
    type: string;
    module: string;
    title?: string;
    status?: string;
    amount?: number;
    currency?: string;
    refId: string;
  }> = [];

  for (const modName of moduleNames) {
    const modelKey = toModelKey(modName);
    const raw = models[modelKey];
    if (!raw || typeof raw.find !== "function") continue;

    const m = asModel<any>(raw);
    const sortField = defaultDateField(modName, String(modelKey));

    const docs = (await m
      .find({ tenant })
      .select(`_id ${sortField} updatedAt createdAt status title name subject date amount total totals currency code filename minutes rating type method`)
      .sort({ [sortField]: -1 } as any)
      .limit(limit)
      .lean()) as any[];

    for (const d of docs) {
      const tsVal = d[sortField] || d.updatedAt || d.createdAt || d.date;
      const ts = tsVal ? new Date(tsVal) : null;
      const amount =
        typeof d.amount === "number" ? d.amount :
        typeof d.total === "number" ? d.total :
        typeof d.minutes === "number" ? d.minutes :
        typeof d.rating === "number" ? d.rating :
        typeof d?.totals?.grand === "number" ? d.totals.grand :
        undefined;

      events.push({
        ts,
        type: modName,
        module: String(modelKey).toLowerCase(),
        title: d?.title?.tr || d?.title?.en || d?.name || d?.subject || d?.code || d?.filename,
        status: d.status || d.type,
        amount,
        currency: d?.currency || d?.totals?.currency || "TRY",
        refId: String(d._id),
      });
    }
  }

  // Basit grouped dönüş (geriye uyum için ilk 3 modülü ayrıca döndürmek istersen)
  const sorted = events
    .filter((e) => e.ts && !isNaN(new Date(e.ts as any).getTime()))
    .sort((a, b) => new Date(b.ts as any).getTime() - new Date(a.ts as any).getTime())
    .slice(0, limit);

  return { events: sorted, limit };
}
