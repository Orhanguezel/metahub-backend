// src/modules/search/public.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { buildLooseRegex, pickLocalizedText } from "./projector.service";

/** yardımcı: güvenli üç regex (prefix / anywhere / loose) */
function buildRegexSet(qRaw: string) {
  const raw = String(qRaw || "").trim();
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    rxPrefix: new RegExp("^" + escaped, "i"),
    rxAny: new RegExp(escaped, "i"),
    rxLoose: buildLooseRegex(raw),
  };
}

/** GET /api/v1/search?q=...&type=&page=&limit= */
export const publicSearch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { SearchIndex } = await getTenantModels(req);
  const { q, type, page = "1", limit = "20" } = req.query as Record<string, string>;

  const { rxLoose, rxAny } = buildRegexSet(q || "");
  const qLower = String(q || "").trim().toLowerCase();

  const base: any = { tenant: req.tenant, isActive: true };

  // OR dallarını kur: slug tam eşleşmesi type'tan bağımsız olsun (kullanıcı yanlış type verse bile bulunsun)
  const or: any[] = [];
  if (qLower) {
    or.push({ slug: qLower }); // cross-type exact slug
  }
  if (type) {
    // type'a saygılı dallar
    or.push({ type, slug: rxAny });
    or.push({ type, searchable: rxLoose });
    or.push({ type, searchable: rxAny });
  } else {
    // type verilmediyse hepsinde ara
    or.push({ slug: rxAny });
    or.push({ searchable: rxLoose });
    or.push({ searchable: rxAny });
  }

  const filter = { ...base, $or: or };

  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const lm = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const cursor = SearchIndex.find(filter)
    .sort({ boost: -1, updatedAt: -1 })
    .skip((pg - 1) * lm)
    .limit(lm)
    .lean();

  // total'i type'a bağlı kalmadan kaba olarak göstermek yerine mevcut filtre ile sayalım
  const [items, total] = await Promise.all([cursor, SearchIndex.countDocuments(filter)]);
  res.status(200).json({ success: true, data: items, meta: { page: pg, limit: lm, total } });
});

/** GET /api/v1/search/suggest?q=...&type=&limit= */
export const publicSuggest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Suggestion, SearchIndex } = await getTenantModels(req);
  const { q, type, limit = "10" } = req.query as Record<string, string>;
  const lm = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20);

  const { rxPrefix, rxAny } = buildRegexSet(q || "");

  /* 1) suggestion tablosu (prefix) */
  const sugFilter: any = { tenant: req.tenant, q: rxPrefix };
  if (type) sugFilter.type = type;
  const sug = await Suggestion.find(sugFilter)
    .sort({ weight: -1, updatedAt: -1 })
    .limit(lm)
    .lean();

  /* 2) search_index fallback
     - type verilse de slug ^prefix eşleşmesini type'tan bağımsız ekle
     - diğer dallarda type'a saygı göster
  */
  const idxOr: any[] = [{ slug: rxPrefix }]; // cross-type slug prefix
  if (type && type !== "search") {
    idxOr.push({ type, searchable: rxAny });
  } else {
    idxOr.push({ searchable: rxAny });
  }

  const idxFilter: any = { tenant: req.tenant, isActive: true, $or: idxOr };

  const idx = await SearchIndex.find(idxFilter)
    .select("title slug type")
    .sort({ boost: -1, updatedAt: -1 })
    .limit(lm)
    .lean();

  const rows = [
    ...sug.map((s: any) => ({ q: s.q, type: s.type, weight: s.weight || 1 })),
    ...idx.map((i: any) => ({
      q: (pickLocalizedText(i.title) || i.slug || "").toString(),
      type: i.type,
      weight: 1,
    })),
  ].filter((r) => r.q);

  // tekilleştir (q+type)
  const uniq = new Map<string, { q: string; type: string; weight: number }>();
  for (const r of rows) {
    const key = `${(r.q || "").toLowerCase()}|${r.type}`;
    if (!uniq.has(key) || uniq.get(key)!.weight < r.weight) uniq.set(key, r);
  }

  const out = Array.from(uniq.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, lm);

  res.status(200).json({ success: true, data: out });
});

/** POST /api/v1/search/track { q, type } */
export const publicTrackSearch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Suggestion } = await getTenantModels(req);
  const { q, type = "search" } = req.body as { q: string; type?: "product" | "brand" | "category" | "search" };

  const norm = String(q || "").trim().toLowerCase();
  if (!norm) { res.status(400).json({ success: false, message: "q_required" }); return; }

  await Suggestion.updateOne(
    { tenant: req.tenant, q: norm, type },
    { $setOnInsert: { tenant: req.tenant, type }, $set: { q: norm }, $inc: { weight: 1 } },
    { upsert: true }
  );

  res.status(202).json({ success: true });
});
