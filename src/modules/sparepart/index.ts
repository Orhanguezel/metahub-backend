import express from "express";
import routes from "./sparepart.routes";
import { Sparepart } from "./sparepart.models";
import * as sparePartController from "./sparepart.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart)
export { Sparepart, sparePartController };
export * from "./sparepart.validation";

export default router;
