export const getRoutesContent = (moduleName: string, CapName: string) => `
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreate${CapName} } from "./${moduleName}.validation";
import {
  create${CapName},
  getAll${CapName},
  update${CapName},
  delete${CapName}
} from "./${moduleName}.controller";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create
router.post("/", validateCreate${CapName}, create${CapName});

// 📝 Get All
router.get("/", getAll${CapName});

// ✏️ Update
router.put("/:id", validateCreate${CapName}, update${CapName});

// 🗑️ Delete
router.delete("/:id", delete${CapName});

export default router;
`;
