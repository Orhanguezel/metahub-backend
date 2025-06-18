// src/modules/users/index.ts
import express from "express";
import userRoutes from "./users.routes";
import accountRoutes from "./account.routes";
import authAdvancedRoutes from "./auth.advanced.routes";
import { User } from "./users.models";

const router = express.Router();

router.use("/", userRoutes);
router.use("/account", accountRoutes);
router.use("/advanced-auth", authAdvancedRoutes);

export { User };
export default router;
