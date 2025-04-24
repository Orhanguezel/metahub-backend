import express from "express";
import routes from "./address.routes";

export { default as Address } from "./address.models";

const router = express.Router();
router.use("/", routes);

export default router;
