// src/modules/about/index.ts

import express from "express";
import routes from "./routes";

const router = express.Router();

// 🔐 Routes
router.use("/", routes);


export default router;
