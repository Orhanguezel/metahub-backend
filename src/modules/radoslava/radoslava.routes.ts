
  import express from "express";
  import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
  import { validateCreateRadoslava } from "./radoslava.validation";
  import { createRadoslava, getAllRadoslava, updateRadoslava, deleteRadoslava } from "./radoslava.controller";
  
  const router = express.Router();
  
  router.use(authenticate, authorizeRoles("admin"));
  
  // ➕ Create
  router.post("/", validateCreateRadoslava, createRadoslava);
  
  // 📝 Get All
  router.get("/", getAllRadoslava);
  
  // ✏️ Update
  router.put("/:id", validateCreateRadoslava, updateRadoslava);
  
  // 🗑️ Delete
  router.delete("/:id", deleteRadoslava);
  
  export default router;
  