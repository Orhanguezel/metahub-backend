import express from "express";
import routes from "./offer.routes";
import { Offer } from "./offer.models";
import * as offerController from "./offer.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { Offer, offerController };
export * from "./offer.validation";
export default router;
