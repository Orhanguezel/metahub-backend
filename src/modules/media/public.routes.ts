import express from "express";
import { publicList, publicGetById } from "./public.controller";
import { validateList, validateGetById } from "./validation";

const router = express.Router();

// (İstersen buraya rate limit ekleyebilirsin)
router.get("/", validateList, publicList);
router.get("/:id", validateGetById, publicGetById);

export default router;
