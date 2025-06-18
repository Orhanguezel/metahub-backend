// src/scripts/createModule/createModule.ts

import fs from "fs";
import path from "path";
import logger from "@/core/middleware/logger/logger";
import { writeModuleFiles } from "./writeModuleFiles";
import { createMetaFile } from "./createMetaFile";
import { getEnabledModulesFromEnv } from "@/core/utils/envHelpers";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n"; // createModule i18n dosyası!
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// --- CLI Context (Loglar için) ---
function getCliContext(tenant: string) {
  return {
    tenant,
    pid: process.pid,
    cwd: process.cwd(),
    user: process.env.USER || process.env.USERNAME || "cli",
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };
}

// --- Tenant tespiti CLI veya ENV üzerinden ---
function getTenantFromArgsOrEnv(): string {
  const arg = process.argv.find((a) => a.startsWith("--tenant="));
  if (arg) return arg.replace("--tenant=", "");
  if (process.env.TENANT_NAME) return process.env.TENANT_NAME;
  logger.error("❌ Tenant is required! Use --tenant=xyz or TENANT_NAME env.", {
    module: "createModule",
    status: "fail",
    ...getCliContext("unknown"),
  });
  process.exit(1);
}
const tenant = getTenantFromArgsOrEnv();
const lang: SupportedLocale = getLogLocale();

// --- Module name parametresi kontrolü ---
const moduleName = process.argv[2];
const useAnalyticsFlag = process.argv.includes("--analytics");

if (!moduleName) {
  logger.error(t("createModule.noModuleName", lang, translations, { tenant }), {
    tenant,
    module: "createModule",
    status: "fail",
    ...getCliContext(tenant),
  });
  process.exit(1);
}

// --- Sadece tenant'ın ENABLED_MODULES içindeyse devam et ---
const enabledModules = getEnabledModulesFromEnv(tenant);
if (!enabledModules.includes(moduleName)) {
  logger.error(
    t("createModule.notEnabled", lang, translations, { moduleName, tenant }),
    { tenant, module: "createModule", status: "fail", ...getCliContext(tenant) }
  );
  process.exit(1);
}

// --- Tenant-aware dosya yolları ---
const modulesPath = path.resolve(process.cwd(), "src/modules");
const metaConfigDir = path.resolve(process.cwd(), "src/meta-configs", tenant);
const metaPath = path.join(metaConfigDir, `${moduleName}.meta.json`);
const modulePath = path.join(modulesPath, moduleName);

// --- Modül klasörünü oluştur ---
try {
  fs.mkdirSync(modulePath, { recursive: true });
  logger.info(
    t("createModule.dirCreated", lang, translations, { modulePath, tenant }),
    {
      tenant,
      module: "createModule",
      status: "success",
      ...getCliContext(tenant),
    }
  );
} catch (err) {
  logger.error(
    t("createModule.dirCreateFail", lang, translations, {
      modulePath,
      tenant,
    }) +
      " " +
      String(err),
    {
      tenant,
      module: "createModule",
      status: "fail",
      error: err,
      ...getCliContext(tenant),
    }
  );
  process.exit(1);
}

// --- Boilerplate dosyaları yaz ---
try {
  writeModuleFiles(modulePath, moduleName);
  logger.info(
    t("createModule.filesWritten", lang, translations, { moduleName, tenant }),
    {
      tenant,
      module: "createModule",
      status: "success",
      ...getCliContext(tenant),
    }
  );
} catch (err) {
  logger.error(
    t("createModule.filesWriteFail", lang, translations, {
      moduleName,
      tenant,
    }) +
      " " +
      String(err),
    {
      tenant,
      module: "createModule",
      status: "fail",
      error: err,
      ...getCliContext(tenant),
    }
  );
  process.exit(1);
}

// --- Tenant meta-config klasörü oluştur (varsa geç) ---
try {
  fs.mkdirSync(metaConfigDir, { recursive: true });
} catch {
  /* already exists */
}

// --- Meta dosyasını oluştur ---
createMetaFile(
  moduleName,
  metaConfigDir, // dikkat: burada metaDir yerine metaConfigDir (klasör)
  tenant, // 3. parametre tenant string!
  { useAnalytics: useAnalyticsFlag } // 4. parametre opsiyonel ayarlar
)
  .then(() => {
    logger.info(
      t("createModule.success", lang, translations, { moduleName, tenant }),
      {
        tenant,
        module: "createModule",
        status: "success",
        ...getCliContext(tenant),
      }
    );
    console.log(
      t("createModule.success", lang, translations, { moduleName, tenant })
    );
  })
  .catch((err) => {
    logger.error(
      t("createModule.metaFail", lang, translations, { moduleName, tenant }) +
        " " +
        String(err),
      {
        tenant,
        module: "createModule",
        status: "fail",
        error: err,
        ...getCliContext(tenant),
      }
    );
    process.exit(1);
  });
