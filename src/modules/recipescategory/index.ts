import express from "express";
import routes from "./category.routes";

const router = express.Router();
router.use("/", routes);
export default router;
