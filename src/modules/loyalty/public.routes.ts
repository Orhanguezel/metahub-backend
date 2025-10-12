import express from "express";
import { authenticate } from "@/core/middleware/auth/authMiddleware";
import { getMyBalance, getMyLedger } from "./public.controller";
import { validatePublicBalance, validatePublicList } from "./validation";

const router = express.Router();

// Public ama kullanıcı bazlı → auth zorunlu
router.use(authenticate);

router.get("/balance", validatePublicBalance, getMyBalance);
router.get("/ledger",  validatePublicList,    getMyLedger);

export default router;
