import express from "express";
import routes from "./apikey.routes";

import { Apikey, IApikey, ApiKeyLog, IApiKeyLog } from "./apikey.models";

const router = express.Router();
router.use("/", routes);

// Route Export (default)
export default router;

// Named exports – centrally accessible
export * from "./apikey.controller";
export * from "./apikey.validation";
export { Apikey, IApikey, ApiKeyLog, IApiKeyLog };
