// src/tools/createModule.ts

import fs from "fs";
import path from "path";
import { writeModuleFiles } from "./writeModuleFiles";
import { createMetaFile } from "./createMetaFile";

const moduleName = process.argv[2];

if (!moduleName) {
  console.error("❌ Please provide a module name");
  process.exit(1);
}

const modulesPath = path.resolve(__dirname, "../modules");
const metaPath = path.resolve(__dirname, "../meta-configs/ensotek");
const modulePath = path.join(modulesPath, moduleName);

if (fs.existsSync(modulePath)) {
  console.error(`❌ Module "${moduleName}" already exists.`);
  process.exit(1);
}

fs.mkdirSync(modulePath, { recursive: true });

// 📄 Write initial files
writeModuleFiles(modulePath, moduleName);

// 🧠 Create meta file
createMetaFile(moduleName, metaPath)
  .then(() => {
    console.log(`✅ Module "${moduleName}" created successfully!`);
  })
  .catch((err) => {
    console.error("❌ Failed to create meta file:", err);
    process.exit(1);
  });
