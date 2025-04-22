import express from "express";
import routes from "./users.routes";

const router = express.Router();
router.use("/", routes);

export * from "./account.controller";
export * from "./address.controller";
export * from "./auth.controller";
export * from "./status.controller";
export * from "./users.models";

export default router;
