import { Request, Response } from "express";
import logger from "@/core/middleware/logger/logger";
import { ensureTenant, validateRange, validatePagination } from "./dashboard.validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import type { Model } from "mongoose";

/** Invoice totals expr: grand → total → gross → net → total(field) → 0 */
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

const asModel = <T = any>(m: unknown) => m as Model<T>;

export async function getDashboardReport(req: Request, res: Response) {
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
  const { limit, offset } = validatePagination(req.query.limit as any, req.query.offset as any);

  // İsteğe bağlı: include=payments,expenses,invoicing (section filtreleme)
  const include = String(req.query.include || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const want = (key: "invoicing" | "payments" | "expenses") =>
    include.length ? include.includes(key) : true;

  try {
    const models = await getTenantModels(req);
    const Invoice = asModel((models as any).Invoice);
    const Payment = asModel((models as any).Payment);
    const Expense = asModel((models as any).Expense);
    const Customer = asModel((models as any).Customer); // opsiyonel enrich

    const tasks: Array<Promise<any>> = [];

    // 1) Top 5 alacak (müşteriye göre) – sadece invoicing istenirse
    let topUnpaidPromise: Promise<any[]> | undefined;
    if (Invoice && want("invoicing")) {
      topUnpaidPromise = Invoice.aggregate([
        {
          $match: {
            tenant,
            status: { $in: ["sent", "overdue", "partially_paid"] },
          },
        },
        // customerId veya customer alanını normalize ederek grupla
        {
          $addFields: {
            _customerId: { $ifNull: ["$customerId", "$customer"] },
            _total: INVOICE_TOTAL_EXPR,
          },
        },
        {
          $group: {
            _id: "$_customerId",
            total: { $sum: "$_total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]).then(async (rows: any[]) => {
        // Customer enrich (varsa)
        const ids = rows.map((r) => r._id).filter(Boolean);
        let map = new Map<string, any>();
        if (Customer && ids.length) {
          const docs = await Customer.find({ tenant, _id: { $in: ids } })
            .select("companyName contactName email phone")
            .lean();
          map = new Map(docs.map((d: any) => [String(d._id), d]));
        }
        return rows.map((r) => ({
          customerId: r._id ? String(r._id) : undefined,
          customer: r._id ? map.get(String(r._id)) || null : null,
          total: Number(r.total || 0),
          count: Number(r.count || 0),
        }));
      });
      tasks.push(topUnpaidPromise);
    }

    // 2) Son faturalar – invoicing istenirse
    let latestInvoicesPromise: Promise<any[]> | undefined;
    if (Invoice && want("invoicing")) {
      latestInvoicesPromise = Invoice.find({ tenant })
        .select("createdAt updatedAt status totals total currency customerId customer")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec()
        .then((docs: any[]) =>
          docs.map((d) => ({
            _id: String(d._id),
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            status: d.status,
            // totals fallback
            total:
              d?.totals?.grand ??
              d?.totals?.total ??
              d?.totals?.gross ??
              d?.totals?.net ??
              d?.total ??
              0,
            currency: d?.currency || d?.totals?.currency || "TRY",
            customerId: d.customerId || d.customer || undefined,
          }))
        );
      tasks.push(latestInvoicesPromise);
    }

    // 3) Son ödemeler – payments istenirse
    let latestPaymentsPromise: Promise<any[]> | undefined;
    if (Payment && want("payments")) {
      latestPaymentsPromise = Payment.find({ tenant })
        .select("date amount method currency customerId")
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec()
        .then((docs: any[]) =>
          docs.map((d) => ({
            _id: String(d._id),
            date: d.date,
            amount: Number(d.amount || 0),
            method: d.method,
            currency: d.currency || "TRY",
            customerId: d.customerId || undefined,
          }))
        );
      tasks.push(latestPaymentsPromise);
    }

    // 4) Gider dağılımı – expenses istenirse
    let expenseBreakdownPromise: Promise<any[]> | undefined;
    if (Expense && want("expenses")) {
      expenseBreakdownPromise = Expense.aggregate([
        { $match: { tenant, date: { $gte: r.range.from, $lte: r.range.to } } },
        { $group: { _id: "$type", amount: { $sum: "$amount" } } },
        { $project: { type: "$_id", amount: 1, _id: 0 } },
        { $sort: { amount: -1 } },
      ]);
      tasks.push(expenseBreakdownPromise);
    }

    const settled = await Promise.allSettled(tasks);

    // Sıra: topUnpaid, latestInvoices, latestPayments, expenseBreakdown
    let idx = 0;
    const topUnpaid =
      topUnpaidPromise ? (settled[idx++].status === "fulfilled" ? (settled[idx - 1] as any).value : []) : [];
    const latestInvoices =
      latestInvoicesPromise ? (settled[idx++].status === "fulfilled" ? (settled[idx - 1] as any).value : []) : [];
    const latestPayments =
      latestPaymentsPromise ? (settled[idx++].status === "fulfilled" ? (settled[idx - 1] as any).value : []) : [];
    const expenseBreakdown =
      expenseBreakdownPromise ? (settled[idx++].status === "fulfilled" ? (settled[idx - 1] as any).value : []) : [];

    res.status(200).json({
      success: true,
      message: t("dashboard.report.success", { sections: ["invoicing","payments","expenses"].filter(want).length }),
      data: { topUnpaid, latestInvoices, latestPayments, expenseBreakdown },
    });

    logger.withReq.info(req, "[DASHBOARD] report ok", {
      module: "dashboard",
      event: "report.ok",
      tenant,
      tookMs: Date.now() - startedAt,
      range: { from: r.range.from.toISOString(), to: r.range.to.toISOString() },
      include,
      sizes: {
        topUnpaid: topUnpaid.length,
        latestInvoices: latestInvoices.length,
        latestPayments: latestPayments.length,
        expenseBreakdown: expenseBreakdown.length,
      },
      context: getRequestContext(req),
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[DASHBOARD] report fail", {
      module: "dashboard",
      event: "report.fail",
      tenant,
      error: err?.message,
      stack: err?.stack,
      context: getRequestContext(req),
    });
    res.status(500).json({ success: false, message: "dashboard.report.error" });
    return;
  }
}
