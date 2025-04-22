import express from "express";
import routes from "./account.routes";

const router = express.Router();
router.use("/", routes);

export default router;
