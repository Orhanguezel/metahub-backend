import express from "express";
import routes from "./custompizza.routes";

const router = express.Router();
router.use("/", routes);

export * from "./custompizza.controller";
export * from "./custompizza.models";

export default router;
