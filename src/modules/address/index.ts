import express from "express";
import addressRoutes from "./routes";

const router = express.Router();
router.use("/", addressRoutes);
export default router;
