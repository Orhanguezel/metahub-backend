// src/modules/apartment/index.ts

import express from "express";
import routes from "./admin.routes";

const router = express.Router();
router.use("/", routes);


export default router;
