// src/modules/authlite/index.ts

import express from "express";
import routes from "./authlite.routes";

const router = express.Router();

// 🌍 Public Routes
router.use("/", routes);


export default router;
