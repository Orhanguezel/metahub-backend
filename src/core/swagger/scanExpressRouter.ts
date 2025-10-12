import type { Router } from "express";

/** Router içindeki tüm endpoint’leri (method+path) çıkarır. */
export type ScannedRoute = {
  method: string; // GET/POST/PUT/DELETE...
  path: string;   // /admin/users, /health, ...
};

type AnyLayer = any;

/** layer.regexp -> string path tahmini (Express 4 iç regex hack) */
function extractPathFromRegexp(regexp: RegExp & { fast_slash?: boolean }): string {
  if (!regexp) return "";
  if ((regexp as any).fast_slash) return "/";

  const src = regexp.toString(); // örn: /^\/admin\/?(?=\/|$)/i

  // Sık görülen pattern'ler için çıkarım
  const candidates = [
    /^\/*\^\\\/(.+?)\\\/\?\(\?=\\\/\|\$\)\/[a-z]*$/i,
    /^\/*\^\\\/(.+?)\\\/\?\$\/[a-z]*$/i,
    /^\/*\^\\\/(.+?)\\\//i,
  ];

  for (const re of candidates) {
    const m = src.match(re);
    if (m?.[1]) {
      return `/${m[1].replace(/\\\//g, "/")}`;
    }
  }

  return "";
}

/** path bir dizi olabilir: normalize et (string | string[] | RegExp | fast_slash obj | undefined) */
function normalizeRoutePaths(p: unknown): string[] {
  // array ise her bir öğeyi normalize et
  if (Array.isArray(p)) {
    const out: string[] = [];
    for (const it of p) {
      out.push(...normalizeRoutePaths(it));
    }
    return out.length ? out : ["/"];
  }

  // string ise
  if (typeof p === "string") {
    return [p.startsWith("/") ? p : `/${p}`];
  }

  // RegExp ise
  if (p instanceof RegExp) {
    const guess = extractPathFromRegexp(p);
    return [guess || "/"];
  }

  // fast_slash nesnesi olabilir (Express internals)
  if (p && typeof p === "object" && "fast_slash" in (p as any)) {
    return ["/"];
  }

  // bilinmeyen/undefined: fallback
  return ["/"];
}

/** path join (çift / temizler) */
function joinPath(...parts: string[]): string {
  const raw = parts
    .filter(Boolean)
    .map((p) => (p.startsWith("/") ? p : `/${p}`))
    .join("");
  return raw.replace(/\/{2,}/g, "/");
}

/** Router stack’ini DFS gez: full base path ile route’ları topla */
export function scanExpressRouter(router: Router, base = ""): ScannedRoute[] {
  const out: ScannedRoute[] = [];
  const stack: AnyLayer[] = (router as any)?.stack || [];

  for (const layer of stack) {
    try {
      // Alt router ise
      if (layer && layer.name === "router" && layer.handle && layer.handle.stack) {
        const layerPath =
          layer.path || extractPathFromRegexp(layer.regexp as any) || "";
        const childBase = joinPath(base, layerPath || "");
        out.push(...scanExpressRouter(layer.handle as Router, childBase));
        continue;
      }

      // Normal route ise
      if (layer && layer.route && layer.route.methods) {
        const routePaths = normalizeRoutePaths(layer.route.path);
        const methods = Object.keys(layer.route.methods).filter(
          (m) => layer.route.methods[m]
        );

        for (const m of methods) {
          for (const p of routePaths) {
            out.push({ method: m.toUpperCase(), path: joinPath(base, p) });
          }
        }
      }
    } catch (e) {
      // Bir layer patlarsa diğerlerini taramaya devam et
      // (İstersen burada console.warn ile layer bilgisi loglayabilirsin)
      continue;
    }
  }

  return out;
}
