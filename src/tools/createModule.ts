import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const moduleName = process.argv[2];

if (!moduleName) {
  console.error("❌ Please provide a module name");
  process.exit(1);
}

const basePath = path.join(__dirname, "..", "modules", moduleName);
const metaPath = path.join(__dirname, "..", "meta-configs", "metahub", `${moduleName}.meta.json`);

if (fs.existsSync(basePath)) {
  console.error("❌ Module already exists");
  process.exit(1);
}

fs.mkdirSync(basePath, { recursive: true });

const testTemplate = `import request from "supertest";
import app from "@/server";

describe("${capitalize(moduleName)} module", () => {
  it("should create a new ${moduleName}", async () => {});
  it("should get all ${moduleName}s", async () => {});
  it("should update a ${moduleName}", async () => {});
  it("should delete a ${moduleName}", async () => {});
});
`;

const files = {
  [`${moduleName}.controller.ts`]: `import { Request, Response } from "express";\n\n// TODO: Implement controller functions\n`,
  [`${moduleName}.models.ts`]: `import { Schema, model } from "mongoose";\n\nconst ${capitalize(moduleName)}Schema = new Schema({});\n\nexport default model("${capitalize(moduleName)}", ${capitalize(moduleName)}Schema);\n`,
  [`${moduleName}.routes.ts`]: `import { Router } from "express";\nconst router = Router();\n\n// TODO: Define routes\n\nexport default router;\n`,
  [`${moduleName}.validation.ts`]: `import { z } from "zod";\n\nexport const ${capitalize(moduleName)}CreateSchema = z.object({});\n`,
  [`index.ts`]: `import express from "express";\nimport routes from "./${moduleName}.routes";\n\nconst router = express.Router();\nrouter.use("/", routes);\n\nexport * from "./${moduleName}.controller";\nexport { default as ${capitalize(moduleName)} } from "./${moduleName}.models";\nexport default router;\n`,
};

for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(basePath, file), content);
}

const testPath = path.join(basePath, "__tests__");
fs.mkdirSync(testPath, { recursive: true });
fs.writeFileSync(path.join(testPath, `${moduleName}.controller.spec.ts`), testTemplate);

// Git kullanıcısını al
let gitUser = "unknown";
try {
  gitUser = execSync("git config user.name").toString().trim();
} catch (err) {
  console.warn("⚠️ Git user.name could not be determined");
}

const now = new Date().toISOString();

// Meta dosyası oluştur
const meta = {
  name: moduleName,
  icon: "box",
  visibleInSidebar: true,
  roles: ["admin"],
  enabled: true,
  useAnalytics: false,
  language: "en",
  version: "1.0.0",
  updatedBy: gitUser,
  lastUpdatedAt: now,
  routes: [], // örnek olarak eklenebilir
  history: [
    {
      version: "1.0.0",
      at: now,
      by: gitUser,
      note: "Initial module creation"
    }
  ]
};

fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

console.log(`✅ Module "${moduleName}" created successfully.`);

function capitalize(str: string) {
  return str.charAt(0).toLocaleUpperCase("en-US") + str.slice(1);
}
