import express from "express";
import routes from "./newscategory.routes";
import NewsCategory from "./newscategory.models";

const router = express.Router();
router.use("/", routes);

export { NewsCategory };
export * from "./newscategory.controller";
export * from "./newscategory.models";
export * from "./newscategory.validation";

export default router;
