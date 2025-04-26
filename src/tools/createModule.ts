import fs from "fs/promises";
import path from "path";
import { getGitUser, getGitCommitHash } from "@/scripts/generateMeta/utils/gitHelpers";
import { updateMetaVersionLog } from "@/scripts/generateMeta/utils/versionHelpers";
import { metaConfig } from "@/scripts/generateMeta/generateMeta.config";

const moduleName = process.argv[2];

if (!moduleName) {
  console.error("❌ Please provide a module name");
  process.exit(1);
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const modulesDir = path.resolve(__dirname, "../modules");
const metaDir = path.resolve(__dirname, "../meta-configs/metahub");

const modulePath = path.join(modulesDir, moduleName);
const metaPath = path.join(metaDir, `${moduleName}.meta.json`);

async function createModule() {
  try {
    // Eğer modül klasörü varsa hata ver
    try {
      await fs.access(modulePath);
      console.error(`❌ Module "${moduleName}" already exists.`);
      process.exit(1);
    } catch {
      // klasör yok, devam edelim
    }

    // Klasörleri oluştur
    await fs.mkdir(modulePath, { recursive: true });
    await fs.mkdir(path.join(modulePath, "__tests__"), { recursive: true });

    // 📄 Dosya şablonları
    const files: Record<string, string> = {
      [`${moduleName}.controller.ts`]: `
import { Request, Response } from "express";
import { asyncHandler } from "@/core/middleware/asyncHandler";
import { ${capitalize(moduleName)} } from "./${moduleName}.models";

// ➕ Create
export const create${capitalize(moduleName)} = asyncHandler(async (req: Request, res: Response) => {
  const created = await ${capitalize(moduleName)}.create(req.body);
  res.status(201).json({ success: true, message: "${capitalize(moduleName)} created", data: created });
});

// 📝 Get All
export const getAll${capitalize(moduleName)} = asyncHandler(async (_req: Request, res: Response) => {
  const all = await ${capitalize(moduleName)}.find();
  res.status(200).json({ success: true, message: "Fetched all ${capitalize(moduleName)}s", data: all });
});

// ✏️ Update
export const update${capitalize(moduleName)} = asyncHandler(async (req: Request, res: Response) => {
  const updated = await ${capitalize(moduleName)}.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) {
    res.status(404).json({ success: false, message: "${capitalize(moduleName)} not found" });
    return;
  }
  res.status(200).json({ success: true, message: "Updated successfully", data: updated });
});

// 🗑️ Delete
export const delete${capitalize(moduleName)} = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await ${capitalize(moduleName)}.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: "${capitalize(moduleName)} not found" });
    return;
  }
  res.status(200).json({ success: true, message: "Deleted successfully" });
});
      `.trim(),

      [`${moduleName}.routes.ts`]: `
import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateCreate${capitalize(moduleName)} } from "./${moduleName}.validation";
import { create${capitalize(moduleName)}, getAll${capitalize(moduleName)}, update${capitalize(moduleName)}, delete${capitalize(moduleName)} } from "./${moduleName}.controller";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

// ➕ Create
router.post("/", validateCreate${capitalize(moduleName)}, create${capitalize(moduleName)});

// 📝 Get All
router.get("/", getAll${capitalize(moduleName)});

// ✏️ Update
router.put("/:id", validateCreate${capitalize(moduleName)}, update${capitalize(moduleName)});

// 🗑️ Delete
router.delete("/:id", delete${capitalize(moduleName)});

export default router;
      `.trim(),

      [`${moduleName}.validation.ts`]: `
import { body } from "express-validator";
import { validateRequest } from "@/core/middleware/validateRequest";

export const validateCreate${capitalize(moduleName)} = [
  body("name").isString().withMessage("Name is required."),
  validateRequest,
];
      `.trim(),

      [`${moduleName}.models.ts`]: `
import mongoose from "mongoose";

const ${capitalize(moduleName)}Schema = new mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

export const ${capitalize(moduleName)} = mongoose.model("${capitalize(moduleName)}", ${capitalize(moduleName)}Schema);
      `.trim(),

      [`index.ts`]: `
import express from "express";
import routes from "./${moduleName}.routes";

const router = express.Router();
router.use("/", routes);

export * from "./${moduleName}.controller";
export * from "./${moduleName}.models";
export default router;
      `.trim(),

      [`__tests__/${moduleName}.controller.spec.ts`]: `
import request from "supertest";
import app from "@/server";

describe("${capitalize(moduleName)} module", () => {
  it("should create a new ${moduleName}", async () => {
    // TODO: Implement test
  });
});
      `.trim(),
    };

    // Dosyaları yazalım
    await Promise.all(
      Object.entries(files).map(([filename, content]) =>
        fs.writeFile(path.join(modulePath, filename), content)
      )
    );

    // Meta dosyası oluştur
    const username = await getGitUser();
    const commitHash = await getGitCommitHash();
    const now = new Date().toISOString();

    const baseMeta = {
      name: moduleName,
      icon: "box",
      visibleInSidebar: true,
      enabled: true,
      roles: ["admin"],
      useAnalytics: false,
      language: "en",
      routes: [],
      updatedBy: { username, commitHash },
      lastUpdatedAt: now,
      history: [],
    };

    const metaWithVersion = updateMetaVersionLog(baseMeta);

    await fs.writeFile(metaPath, JSON.stringify(metaWithVersion, null, 2));
    console.log(`✅ Meta file created: ${metaPath}`);
    console.log(`✅ Module "${moduleName}" created successfully!`);
  } catch (err) {
    console.error("❌ Failed to create module:", err);
    process.exit(1);
  }
}

createModule();
