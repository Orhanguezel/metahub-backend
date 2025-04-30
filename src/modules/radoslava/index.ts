
  import express from "express";
  import routes from "./radoslava.routes";
  
  const router = express.Router();
  router.use("/", routes);
  
  export * from "./radoslava.controller";
  export * from "./radoslava.models";
  export default router;
  