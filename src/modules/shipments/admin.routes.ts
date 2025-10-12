import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  createForOrderNo,
  listAdmin,
  getByIdAdmin,
  postLabelPrinted,
  postMarkShipped,
  postMarkDelivered,
  delShipment,
} from "./admin.controller";
import {
  vCreateForOrderNo,
  vList,
  vId,
  vMarkLabel,
  vMarkShipped,
  vMarkDelivered,
  vDelete,
} from "./validation";

const router = express.Router();

// Okuma: admin, manager, support, picker, viewer
router.use(authenticate);

// liste & get
router.get("/", authorizeRoles("admin","manager","support","picker","viewer"), vList, listAdmin);
router.get("/:id", authorizeRoles("admin","manager","support","picker","viewer"), vId, getByIdAdmin);

// yazma: admin, manager, picker
router.post("/orders/:orderNo/shipments", authorizeRoles("admin","manager","picker"), vCreateForOrderNo, createForOrderNo);
router.post("/:id/label", authorizeRoles("admin","manager","picker"), vMarkLabel, postLabelPrinted);
router.post("/:id/mark-shipped", authorizeRoles("admin","manager","picker"), vMarkShipped, postMarkShipped);
router.post("/:id/mark-delivered", authorizeRoles("admin","manager","picker"), vMarkDelivered, postMarkDelivered);
router.delete("/:id", authorizeRoles("admin","manager","picker"), vDelete, delShipment);

export default router;
