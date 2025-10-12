import express from "express";
import { getAllPricingPlan, getPricingPlanById } from "./public.controller";
import { validateObjectId, validatePublicListQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicListQuery, getAllPricingPlan);
router.get("/:id", validateObjectId("id"), getPricingPlanById);

export default router;
