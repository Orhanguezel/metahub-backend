/**
 * (opsiyonel) tek-çağrı “hepsi” endpoint’i (v2, tenant-aware + i18n)
 * GET /api/dashboard?include=overview,stats,latest&groupBy=week&dateFrom=...&dateTo=...&latestLimit=10
 */
import { Request, Response } from "express";
import logger from "@/core/middleware/logger/logger";
import { ensureTenant, validateRange, validateGroupBy } from "./dashboard.validation";
import { getOverview, getLatest, getTimeSeries } from "./dashboard.stats";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

export async function getDashboardAll(req: Request, res: Response) {
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

  const includeSet = new Set(
    String(req.query.include || "overview,stats,latest")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

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

  const latestLimit = Math.max(5, Math.min(50, Number(req.query.latestLimit ?? 10)));

  try {
    // Tenant’a özel modeller
    const models = await getTenantModels(req);

    // Parçalı çalış – olmayan modelde hata verme
    const overviewP = includeSet.has("overview")
      ? getOverview(tenant, r.range, models)
      : Promise.resolve(null);

    // NOT: getTimeSeries = klasik 5 seri (revenue/expenses/net/jobs/time)
    //      Dinamik seri istenirse stats endpoint’ini kullanıyoruz.
    const statsP = includeSet.has("stats")
      ? getTimeSeries(tenant, r.range, g.groupBy, {
          Payment: models.Payment,
          Expense: models.Expense,
          OperationJob: models.OperationJob,
          TimeEntry: models.TimeEntry,
        })
      : Promise.resolve(null);

    const latestP = includeSet.has("latest")
      ? getLatest(tenant, latestLimit, models)
      : Promise.resolve(null);

    const [overview, stats, latest] = await Promise.all([overviewP, statsP, latestP]);

    res.status(200).json({
      success: true,
      message: t("dashboard.all.success", { parts: Array.from(includeSet).join(",") }),
      data: { overview, stats, latest },
      meta: {
        groupBy: g.groupBy,
        range: { from: r.range.from, to: r.range.to },
        latestLimit,
        include: Array.from(includeSet),
      },
    });

    logger.withReq.info(req, "[DASHBOARD] all endpoint ok", {
      module: "dashboard",
      event: "all.ok",
      tenant,
      include: Array.from(includeSet),
      groupBy: g.groupBy,
      range: { from: r.range.from.toISOString(), to: r.range.to.toISOString() },
      tookMs: Date.now() - startedAt,
      context: getRequestContext(req),
    });
    return;
  } catch (err: any) {
    logger.withReq.error(req, "[DASHBOARD] all fail", {
      module: "dashboard",
      event: "all.fail",
      tenant,
      error: err?.message,
      stack: err?.stack,
      context: getRequestContext(req),
    });
    res.status(500).json({ success: false, message: "dashboard.all.error" });
    return;
  }
}
