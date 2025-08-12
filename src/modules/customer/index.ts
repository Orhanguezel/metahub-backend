import express from "express";
import routes from "./customer.routes";

const router = express.Router();
router.use("/", routes);


export default router;
