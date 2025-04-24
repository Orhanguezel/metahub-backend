import express from "express";
import routes from "./sparepart.routes";
import SparePart from "./sparepart.models";

const router = express.Router();
router.use("/", routes);

export * from "./sparepart.controller";

export { SparePart };
export * from "./sparepart.models";

export default router;
