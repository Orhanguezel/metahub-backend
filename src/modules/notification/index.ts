import express from "express";
import routes from "./notification.routes";

const router = express.Router();
router.use("/", routes);

export default router;
