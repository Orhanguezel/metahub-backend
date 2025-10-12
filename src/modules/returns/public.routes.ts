import express from "express";
import { createRMARequest, getRMAByCodePublic } from "./public.controller";
import { validatePublicCreate } from "./validation";

const router = express.Router();

// rma talebi oluştur (guest veya login; req.user varsa user atanır)
router.post("/", validatePublicCreate, createRMARequest);

// kod ile durum sorgu
router.get("/:code", getRMAByCodePublic);

export default router;
