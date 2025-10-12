import express from "express";

/* Admin */
import shipmentMethodAdminRoutes from "./method/shipping-method.admin.routes";
import shipmentAdminRoutes from "./shipping.admin.routes"; // ← dosya adın buysa böyle kalsın
import geoZonesAdminRoutes from "./geozones/geozones.admin.routes";

/* Public */
import shipmentPublicRoutes from "./method/shipping-method.public.routes";
import geoZonesPublicRoutes from "./geozones/geozones.public.routes";

const router = express.Router();

/* ========== ADMIN ========== */
router.use("/admin/methods", shipmentMethodAdminRoutes); // kargo yöntemleri
router.use("/admin/zones", geoZonesAdminRoutes);         // geozone yönetimi
router.use("/admin", shipmentAdminRoutes);               // shipment CRUD/aksiyonları

/* ========== PUBLIC ========== */
router.use("/zones", geoZonesPublicRoutes);              // /shipping/zones/resolve
router.use("/", shipmentPublicRoutes);                   // yöntem listesi + quote + public track

export default router;
