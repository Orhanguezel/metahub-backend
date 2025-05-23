import express from "express";
import reviewRoutes from "./review.routes";
import {Review} from "./review.models";
import * as reviewController from "./review.controller";

const router = express.Router();
router.use("/", reviewRoutes);

// ✅ Guard + Export (standart)
export { Review, reviewController };
export * from "./review.validation"; // ✅ Validasyonları da dışa aktar

export default router;
