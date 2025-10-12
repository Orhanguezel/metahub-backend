// src/modules/seo/utils/xml.ts
import crypto from "crypto";

export type UrlEntry = {
  loc: string;                    // absolute
  lastmod?: string;               // ISO
  changefreq?: string;
  priority?: number;
  alternates?: Array<{ href: string; hreflang: string }>;
};

export function makeETagFromUrls(urls: UrlEntry[]): string {
  const basis = urls.length + ":" + (urls[0]?.lastmod || "") + ":" + (urls[urls.length-1]?.lastmod || "");
  return '"' + crypto.createHash("md5").update(basis).digest("hex") + '"';
}

function escapeXml(s: string) {
  return s
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&apos;");
}

// Tek sitemap XML
export function buildSitemapXml(urls: UrlEntry[]): string {
  const head = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:xhtml="http://www.w3.org/1999/xhtml">`;
  const body = urls.map(u => {
    const alt = (u.alternates || [])
      .map(a => `<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${escapeXml(a.href)}" />`)
      .join("");
    return `<url>` +
      `<loc>${escapeXml(u.loc)}</loc>` +
      (u.lastmod ? `<lastmod>${escapeXml(u.lastmod)}</lastmod>` : "") +
      (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : "") +
      (typeof u.priority === "number" ? `<priority>${u.priority.toFixed(1)}</priority>` : "") +
      alt +
      `</url>`;
  }).join("");
  const foot = `</urlset>`;
  return head + body + foot;
}

// Index XML (birden çok sitemap dosyasını listeler)
export function buildSitemapIndexXml(items: Array<{ loc: string; lastmod?: string }>): string {
  const head = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  const body = items.map(it =>
    `<sitemap><loc>${escapeXml(it.loc)}</loc>${it.lastmod ? `<lastmod>${escapeXml(it.lastmod)}</lastmod>` : ""}</sitemap>`
  ).join("");
  const foot = `</sitemapindex>`;
  return head + body + foot;
}
