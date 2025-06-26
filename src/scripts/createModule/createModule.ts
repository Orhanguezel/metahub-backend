// src/scripts/createModule/createModule.ts

import fs from "fs";
import path from "path";
import logger from "@/core/middleware/logger/logger";
import { writeModuleFiles } from "./writeModuleFiles";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n"; // createModule i18n dosyası!
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// --- CLI Context (Loglar için) ---
function getCliContext() {
  return {
    pid: process.pid,
    cwd: process.cwd(),
    user: process.env.USER || process.env.USERNAME || "cli",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };
}

// --- Module name parametresi kontrolü ---
const moduleName = process.argv[2];
const useAnalyticsFlag = process.argv.includes("--analytics");
const lang: SupportedLocale = getLogLocale();

if (!moduleName) {
  logger.error(t("createModule.noModuleName", lang, translations), {
    module: "createModule",
    status: "fail",
    ...getCliContext(),
  });
  process.exit(1);
}

// --- Dosya yolları ---
const modulesPath = path.resolve(process.cwd(), "src/modules");
const modulePath = path.join(modulesPath, moduleName);

// --- Modül klasörünü oluştur ---
try {
  fs.mkdirSync(modulePath, { recursive: true });
  logger.info(
    t("createModule.dirCreated", lang, translations, { modulePath }),
    {
      module: "createModule",
      status: "success",
      ...getCliContext(),
    }
  );
} catch (err) {
  logger.error(
    t("createModule.dirCreateFail", lang, translations, { modulePath }) +
      " " +
      String(err),
    {
      module: "createModule",
      status: "fail",
      error: err,
      ...getCliContext(),
    }
  );
  process.exit(1);
}

// --- Boilerplate dosyaları yaz ---
try {
  writeModuleFiles(modulePath, moduleName);
  logger.info(
    t("createModule.filesWritten", lang, translations, { moduleName }),
    {
      module: "createModule",
      status: "success",
      ...getCliContext(),
    }
  );
} catch (err) {
  logger.error(
    t("createModule.filesWriteFail", lang, translations, { moduleName }) +
      " " +
      String(err),
    {
      module: "createModule",
      status: "fail",
      error: err,
      ...getCliContext(),
    }
  );
  process.exit(1);
}

console.log(t("createModule.success", lang, translations, { moduleName }));
