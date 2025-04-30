import express from "express";
import routes from "./references.routes";
import { Reference } from "./references.models";

const router = express.Router();
router.use("/", routes);

export * from "./references.controller";
export * from "./references.models"; // IReference, Reference
export { Reference };
export default router;
