// src/scripts/createModule/createMetaFile.ts

import fs from "fs";
import path from "path";
import {
  getGitUser,
  getGitCommitHash,
} from "../generateMeta/helpers/gitHelpers";
import { updateMetaVersionLog } from "../generateMeta/helpers/versionHelpers";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n"; // <-- createModule i18n dosyası!
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

export interface CreateMetaOptions {
  useAnalytics?: boolean;
  language?: string;
}

export const createMetaFile = async (
  moduleName: string,
  metaDir: string,
  tenant: string, // <-- Tenant parametresi zorunlu!
  options?: CreateMetaOptions
) => {
  const lang: SupportedLocale = getLogLocale();

  // Güvenlik ve path kontrolü
  if (!tenant || !tenant.trim()) {
    const msg = t("createMetaFile.noTenant", lang, translations, {
      moduleName,
    });
    logger.error(msg, { module: "createMetaFile", status: "fail" });
    throw new Error(msg);
  }

  try {
    const username = await getGitUser();
    const commitHash = await getGitCommitHash();
    const now = new Date().toISOString();

    // Meta objesini oluştur
    const baseMeta = {
      name: moduleName,
      tenant,
      icon: "box",
      visibleInSidebar: true,
      useAnalytics: options?.useAnalytics ?? false,
      enabled: true,
      roles: ["admin"],
      language: options?.language || "en",
      routes: [],
      updatedBy: { username, commitHash },
      lastUpdatedAt: now,
      history: [],
      showInDashboard: true,
      order: 0,
      statsKey: "",
    };

    // Versiyon & tenant log (t ve lang artık zorunlu!)
    const metaWithVersion = updateMetaVersionLog(
      baseMeta,
      t("meta.created", lang, translations, { moduleName, tenant }),
      tenant,
      t,
      lang
    );

    // Tenant için meta-config dizini
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
      logger.info(
        t("createMetaFile.dirCreated", lang, translations, { metaDir, tenant }),
        { tenant, module: "createMetaFile", status: "success" }
      );
    }

    const metaFilePath = path.join(metaDir, `${moduleName}.meta.json`);
    fs.writeFileSync(metaFilePath, JSON.stringify(metaWithVersion, null, 2));

    logger.info(
      t("createMetaFile.success", lang, translations, { moduleName, tenant }),
      { tenant, module: "createMetaFile", status: "success" }
    );
    return metaFilePath;
  } catch (err) {
    logger.error(
      t("createMetaFile.fail", lang, translations, { moduleName, tenant }) +
        " " +
        String(err),
      { tenant, module: "createMetaFile", status: "fail", error: err }
    );
    throw err;
  }
};
