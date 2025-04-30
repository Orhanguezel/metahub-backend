// src/tools/createModule/fileTemplates.ts

export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const getControllerContent = (CapName: string) => `
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

// ➕ Create
export const create${CapName} = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement create
});

// 📝 Get All
export const getAll${CapName} = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement get all
});

// ✏️ Update
export const update${CapName} = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement update
});

// 🗑️ Delete
export const delete${CapName} = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement delete
});
`;

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

export const getValidationContent = (CapName: string) => `
import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreate${CapName} = [
  body("name").isString().withMessage("Name is required."),
  validateRequest,
];
`;

export const getModelContent = (CapName: string) => `
import mongoose, { Schema, Document, Model } from "mongoose";

export interface I${CapName} extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ${CapName}Schema = new Schema<I${CapName}>({
  name: { type: String, required: true },
}, { timestamps: true });

export const ${CapName}: Model<I${CapName}> =
  mongoose.models.${CapName} || mongoose.model<I${CapName}>("${CapName}", ${CapName}Schema);
`;

export const getIndexContent = (moduleName: string) => `
import express from "express";
import routes from "./${moduleName}.routes";
import { ${capitalize(moduleName)}, I${capitalize(moduleName)} } from "./${moduleName}.models";
import * as ${moduleName}Controller from "./${moduleName}.controller";

const router = express.Router();
router.use("/", routes);

export {
  ${capitalize(moduleName)},
  I${capitalize(moduleName)},
  ${moduleName}Controller
};

export * from "./${moduleName}.validation";
export default router;
`;

export const getTestContent = (CapName: string, moduleName: string) => `
import request from "supertest";
import app from "@/server";

describe("${CapName} module", () => {
  it("should create a new ${moduleName}", async () => {
    // TODO: Add test implementation
  });
});
`;
