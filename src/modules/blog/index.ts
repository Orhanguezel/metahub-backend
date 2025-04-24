import express from "express";
import routes from "./blog.routes";
import Blog, { IBlog } from "./blog.models";

const router = express.Router();
router.use("/", routes);

export { Blog, IBlog };


export * from "./blog.controller";


export default router;
