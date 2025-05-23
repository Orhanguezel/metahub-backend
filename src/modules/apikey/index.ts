import express from "express";
import routes from "./apikey.routes";
import { Apikey, ApiKeyLog } from "./apikey.models";

const router = express.Router();
router.use("/", routes);


export { Apikey, ApiKeyLog };

export * from "./apikey.controller";
export * from "./apikey.validation";

export default router;
