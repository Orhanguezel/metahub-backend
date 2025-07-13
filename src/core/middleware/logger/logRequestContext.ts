// src/core/middleware/logger/logRequestContext.ts
import geoip from "geoip-lite";

const failedGeoIpCache = new Set<string>(); // Her process restartında sıfırlanır

export function getRequestContext(req: any) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",").shift() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown";

  const geo = geoip.lookup(ip);
  const userAgent = req.headers["user-agent"] || "unknown";
  const userId =
    req.user &&
    (typeof req.user._id === "string" || typeof req.user._id === "object")
      ? req.user._id
      : undefined;
  const tenant =
    req.tenant ||
    req.headers["x-tenant"] ||
    (req.hostname ? req.hostname.split(".")[0] : undefined) ||
    process.env.APP_ENV ||
    "unknown";
  const locale = req.locale || req.headers["accept-language"] || "en";

  let location: { type: "Point"; coordinates: [number, number] } | undefined =
    undefined;
  if (geo?.ll && Array.isArray(geo.ll) && geo.ll.length === 2) {
    location = {
      type: "Point",
      coordinates: [geo.ll[1], geo.ll[0]], // [longitude, latitude]
    };
  }

  // Sadece prod ortamında, local IP değilse ve ilk defa fail oluyorsa logla!
  const isLocalIp = ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
  if (
    !geo &&
    process.env.NODE_ENV === "production" &&
    !isLocalIp &&
    !failedGeoIpCache.has(ip)
  ) {
    failedGeoIpCache.add(ip); // Bir daha loglama!
    console.warn(`[${tenant}] 📍 Geo lookup failed for IP:`, ip);
  }

  return {
    tenant,
    ip,
    country: geo?.country,
    city: geo?.city,
    location, // GeoJSON ya da undefined
    userAgent,
    userId,
    locale,
  };
}
