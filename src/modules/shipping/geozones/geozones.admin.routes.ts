// src/modules/shipping/geozones/geozones.admin.routes.ts

import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import { listZones, getZone, createZone, updateZone, deleteZone } from "./geozones.admin.controller";
import { vZoneId, vListZones, vCreateZone, vUpdateZone } from "./geozones.validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin"));

router.get("/", vListZones, listZones);
router.get("/:id", vZoneId, getZone);
router.post("/", vCreateZone, createZone);
router.put("/:id", vZoneId, vUpdateZone, updateZone);
router.delete("/:id", vZoneId, deleteZone);

export default router;
