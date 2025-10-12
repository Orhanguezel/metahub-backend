import express from "express";
import routes from "./email.routes";

const router = express.Router();
router.use("/", routes);

export default router;
