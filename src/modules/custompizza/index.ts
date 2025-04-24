import express from "express";
import routes from "./custompizza.routes";

export { default as CustomPizza } from "./custompizza.models";
export * from "./custompizza.controller";

const router = express.Router();
router.use("/", routes);

export default router;
