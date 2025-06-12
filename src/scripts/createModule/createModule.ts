import fs from "fs";
import path from "path";
import { writeModuleFiles } from "./writeModuleFiles";
import { createMetaFile } from "./createMetaFile";
import { getEnabledModulesFromEnv } from "../../core/utils/envHelpers";

const moduleName = process.argv[2];
const useAnalyticsFlag = process.argv.includes("--analytics"); // ✅ flag desteği

if (!moduleName) {
  console.error("❌ Please provide a module name");
  process.exit(1);
}

// 🔐 Check if module is enabled in .env
const enabledModules = getEnabledModulesFromEnv();

if (!enabledModules.includes(moduleName)) {
  console.error(`❌ Module "${moduleName}" is not listed in ENABLED_MODULES`);
  process.exit(1);
}

const modulesPath = path.resolve(process.cwd(), "src/modules");

const metaConfigRelativePath = process.env.META_CONFIG_PATH;
if (!metaConfigRelativePath) {
  console.error("❌ META_CONFIG_PATH is not defined in environment.");
  process.exit(1);
}

const metaPath = path.resolve(process.cwd(), metaConfigRelativePath);
const modulePath = path.join(modulesPath, moduleName);

if (fs.existsSync(modulePath)) {
  console.error(`❌ Module "${moduleName}" already exists.`);
  process.exit(1);
}

// 📄 Create module folder
fs.mkdirSync(modulePath, { recursive: true });

// 🧱 Generate initial boilerplate files
writeModuleFiles(modulePath, moduleName);

// 🧠 Generate meta file
createMetaFile(moduleName, metaPath, { useAnalytics: useAnalyticsFlag }) // ✅ flag ekleniyor
  .then(() => {
    console.log(`✅ Module "${moduleName}" created successfully!`);
  })
  .catch((err) => {
    console.error("❌ Failed to create meta file:", err);
    process.exit(1);
  });
