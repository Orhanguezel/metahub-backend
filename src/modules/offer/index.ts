import express from "express";
import routes from "./offer.routes";

const router = express.Router();
router.use("/", routes);

export default router;
