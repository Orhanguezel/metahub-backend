import express from "express";
import { getAllPricing, getPricingById } from "./public.controller";
import { validateObjectId, validatePublicListQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicListQuery, getAllPricing);
router.get("/:id", validateObjectId("id"), getPricingById);

export default router;
