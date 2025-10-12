// src/modules/seo/utils/urls.ts
import type { Request } from "express";
import type { ISeoSetting } from "../types";

/**
 * siteUrl normalize:
 * - "ensotek.de" → "https://ensotek.de"
 * - "https://ensotek.de/" → "https://ensotek.de"
 * - pathname/query/fragment varsa atılır (yalnızca scheme + host döner)
 */
export function normalizeSiteUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const raw = String(url).trim();
  if (!raw) return undefined;

  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return `${u.protocol}//${u.host}`; // yalnızca protokol + host
  } catch {
    // Son çare: trailing slash kırp + "https:" gibi edge-case'i düzelt
    return raw
      .replace(/\/+$/, "")
      .replace(/^(https?:)\/+$/, "$1//");
  }
}

/**
 * Tenant bazlı site URL çözümü (öncelik sırası):
 * 1) SeoSetting.siteUrl
 * 2) tenantData.domain.main
 * 3) İstek üstbilgilerinden host/proto (x-forwarded-* destekli)
 */
export function resolveSiteUrl(req: Request, setting?: ISeoSetting): string | undefined {
  // 1) explicit setting
  const direct = normalizeSiteUrl(setting?.siteUrl);
  if (direct) return direct;

  // 2) tenantData.domain.main (middleware doldurmalı)
  const domain = (req as any).tenantData?.domain?.main as string | undefined;
  const fromTenant = normalizeSiteUrl(domain);
  if (fromTenant) return fromTenant;

  // 3) request host (fallback)
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers.host as string) ||
    "";
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";

  if (host) {
    const built = `${proto}://${host}`;
    const n = normalizeSiteUrl(built);
    if (n) return n;
  }

  return undefined;
}

/**
 * Absolut URL üret (güvenli):
 * - path tam URL ise dokunmadan döner
 * - path "//cdn..." ise base protokolü ile tamamlanır
 * - aksi halde siteUrl + path güvenli biçimde birleştirilir
 */
export function toAbs(siteUrl: string, path: string): string {
  if (!siteUrl) return path || "";

  // Tam URL ise
  if (/^https?:\/\//i.test(path)) return path;

  // Protokol-relative ise ("//cdn...")
  if (/^\/\//.test(path)) {
    const base = new URL(normalizeSiteUrl(siteUrl)!);
    return `${base.protocol}${path}`;
  }

  const base = `${normalizeSiteUrl(siteUrl)}/`; // daima trailing slash ile
  // "/" → kök, diğerlerinde baştaki "/" kaldırıp URL ile birleştir
  const rel = path === "/" ? "" : String(path || "").replace(/^\/+/, "");

  return new URL(rel, base).toString();
}

/** Regex dizisini hazırla (geçersiz regex’leri atlar) */
export function compileExcludes(patterns: string[]): RegExp[] {
  return patterns
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as RegExp[];
}

/** Path herhangi bir exclude regex’i ile eşleşiyor mu? */
export function isExcluded(path: string, ex: RegExp[]): boolean {
  return ex.some((r) => r.test(path));
}
