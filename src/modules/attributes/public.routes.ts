import express from "express";
import { publicListAttributes, publicGetAttributeByCode } from "./public.controller";
import { validateAttributeListQuery, validateCodeParam } from "./validation";

const router = express.Router();

router.get("/", validateAttributeListQuery, publicListAttributes);
router.get("/:code", validateCodeParam, publicGetAttributeByCode);

export default router;
