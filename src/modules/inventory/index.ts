import express from "express";
import stockledgerRoutes from "./routes";

const router = express.Router();

router.use("/", stockledgerRoutes);


export default router;
