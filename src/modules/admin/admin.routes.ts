import express, { Request, Response, NextFunction } from "express";
import {
  getAllModules,
  toggleModule,
  getAvailableProjects,
} from "./admin.controller";
import {
  authenticate,
  authorizeRoles,
} from "../../core/middleware/authMiddleware";

const router = express.Router();

const allowedOrigins = process.env.ALLOWED_ADMIN_ORIGINS?.split(",") || [];

router.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

router.options("*", (req: Request, res: Response) => {
  res.sendStatus(200);
});

router.get("/modules", authenticate, authorizeRoles("admin"), getAllModules);
router.patch("/modules/:name", authenticate, authorizeRoles("admin"), toggleModule);
router.get("/projects", authenticate, authorizeRoles("admin"), getAvailableProjects);

export default router;
