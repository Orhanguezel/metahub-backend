import express from "express";
import {
  getAllModules,
  getAvailableProjects,
  getModuleDetail, // ✅ Yeni eklenen fonksiyon
} from "./admin.controller";
import {
  authenticate,
  authorizeRoles,
} from "../../core/middleware/authMiddleware";

const router = express.Router();

const allowedOrigins = process.env.ALLOWED_ADMIN_ORIGINS?.split(",") || [];

// ✅ CORS Middleware (TS uyumlu)
function corsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return; 
  }

  next();
}

router.use(corsMiddleware);

// 👮 Yetkili admin işlemleri
router.get("/modules", authenticate, authorizeRoles("admin"), getAllModules);
router.get("/modules/:name", authenticate, authorizeRoles("admin"), getModuleDetail); // ✅ Yeni endpoint
router.get("/projects", authenticate, authorizeRoles("admin"), getAvailableProjects);

export default router;
