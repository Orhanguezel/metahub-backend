import express from "express";
import routes from "./testmodul.routes";

const router = express.Router();
router.use("/", routes);

export * from "./testmodul.controller";
export { default as Testmodul } from "./testmodul.models";
export default router;
