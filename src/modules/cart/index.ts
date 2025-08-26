import express from "express";
import routes from "./public.routes";
import adminRoutes from "./admin.routes";

const router = express.Router();


router.use("/admin", adminRoutes);
router.use("/", routes);

export default router;
