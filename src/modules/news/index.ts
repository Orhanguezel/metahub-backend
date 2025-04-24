import express from "express";
import routes from "./news.routes";
import News from "./news.models";

const router = express.Router();
router.use("/", routes);

export * from "./news.controller";

export { News };
export * from "./news.models";

export default router;
