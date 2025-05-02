import express from "express";
import routes from "./apikey.routes";

// ✅ Guard + Model Type

import { Apikey, IApikey, ApiKeyLog, IApiKeyLog } from "./apikey.models";

const router = express.Router();
router.use("/", routes);

// ✅ Route Export (default)
export default router;

// ✅ Named exports
export * from "./apikey.controller";
export * from "./apikey.validation";
export { Apikey, IApikey, ApiKeyLog, IApiKeyLog };
