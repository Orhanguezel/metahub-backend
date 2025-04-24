import express from "express";
import routes from "./merhaba.routes";

const router = express.Router();
router.use("/", routes);

export * from "./merhaba.controller";
export { default as Merhaba } from "./merhaba.models";
export default router;
