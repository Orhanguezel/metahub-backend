import express from "express";
import companyRoutes from "./routes";

const router = express.Router();
router.use("/", companyRoutes);

export default router;
