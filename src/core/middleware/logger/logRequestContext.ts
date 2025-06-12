// src/core/middleware/logger/logRequestContext.ts
import geoip from "geoip-lite";

export function getRequestContext(req: any) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",").shift() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown";
  const geo = geoip.lookup(ip);
  const userAgent = req.headers["user-agent"] || "unknown";
  const userId =
    req.user && (typeof req.user._id === "string" || typeof req.user._id === "object")
      ? req.user._id
      : undefined;

  let location = undefined;
  if (geo?.ll && Array.isArray(geo.ll) && geo.ll.length === 2) {
    location = {
      type: "Point",
      coordinates: [geo.ll[1], geo.ll[0]], // [lon, lat]
    };
  }
  if (!geo) {
  console.warn("📍 Geo lookup failed for IP:", ip);
}


  return {
    ip,
    country: geo?.country,
    city: geo?.city,
    location, // Artık YALNIZCA tam GeoJSON veya undefined!
    userAgent,
    userId,
  };
}
