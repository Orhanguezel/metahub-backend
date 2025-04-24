// scripts/createModule.ts
import fs from "fs";
import path from "path";

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

// 🚀 CRUD fonksiyonları için Jest test şablonu
const testTemplate = `import request from "supertest";
import app from "@/server"; 

describe("${capitalize(moduleName)} module", () => {
  it("should create a new ${moduleName}", async () => {
    // TODO: Implement POST test
  });

  it("should get all ${moduleName}s", async () => {
    // TODO: Implement GET test
  });

  it("should update a ${moduleName}", async () => {
    // TODO: Implement PUT/PATCH test
  });

  it("should delete a ${moduleName}", async () => {
    // TODO: Implement DELETE test
  });
});
`;

const files = {
  [`${moduleName}.controller.ts`]: `import { Request, Response } from "express";\n\n// TODO: Implement controller functions\n`,
  [`${moduleName}.models.ts`]: `import { Schema, model } from "mongoose";\n\nconst ${capitalize(moduleName)}Schema = new Schema({});\n\nexport default model("${capitalize(moduleName)}", ${capitalize(moduleName)}Schema);\n`,
  [`${moduleName}.routes.ts`]: `import { Router } from "express";\nconst router = Router();\n\n// TODO: Define routes\n\nexport default router;\n`,
  [`${moduleName}.validation.ts`]: `import { z } from "zod";\n\nexport const ${capitalize(moduleName)}CreateSchema = z.object({});\n`,
  [`index.ts`]: `import express from "express";\nimport routes from "./${moduleName}.routes";\n\nconst router = express.Router();\nrouter.use("/", routes);\n\nexport * from "./${moduleName}.controller";\nexport { default as ${capitalize(moduleName)} } from "./${moduleName}.models";\nexport default router;\n`,
};

// 📝 Modül dosyalarını yaz
for (const [file, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(basePath, file), content);
}

// 📁 Test klasörü + test dosyası oluştur
const testPath = path.join(basePath, "__tests__");
fs.mkdirSync(testPath, { recursive: true });
fs.writeFileSync(path.join(testPath, `${moduleName}.controller.spec.ts`), testTemplate);

// 🗂 Meta dosyası oluştur
const meta = {
  name: moduleName,
  icon: "box",
  visibleInSidebar: true,
  roles: ["admin"],
  enabled: true,
  useAnalytics: false,
  language: "en",
  routes: [],
};

fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

console.log(`✅ Module "${moduleName}" created successfully.`);

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
