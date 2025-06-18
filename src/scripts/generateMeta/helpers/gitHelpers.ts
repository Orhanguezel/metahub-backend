// src/scripts/generateMeta/utils/gitHelpers.ts

import { execSync } from "child_process";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

/**
 * Her logda tenant context (isteğe bağlı) ile kullanılır.
 * Scriptler --tenant veya TENANT_NAME ile çağrıldığında tenant parametresi gönderilmeli.
 */

function getLang(): SupportedLocale {
  return getLogLocale();
}

/**
 * Aktif git kullanıcısı.
 * @param tenant Hangi tenant için çalıştığını belirtir (opsiyonel).
 */
export function getGitUser(tenant?: string): string {
  const lang = getLang();
  try {
    const user = execSync("git config user.name").toString().trim();
    return user;
  } catch {
    logger.warn(t("meta.git.userNotFound", lang, translations), {
      tenant,
      module: "meta",
      event: "meta.git.userNotFound",
      status: "fail",
    });
    return "unknown";
  }
}

/**
 * Aktif git commit hash'i.
 * @param tenant Hangi tenant için çalıştığını belirtir (opsiyonel).
 */
export function getGitCommitHash(tenant?: string): string {
  const lang = getLang();
  try {
    const hash = execSync("git rev-parse HEAD").toString().trim();
    return hash;
  } catch {
    logger.warn(t("meta.git.commitNotFound", lang, translations), {
      tenant,
      module: "meta",
      event: "meta.git.commitNotFound",
      status: "fail",
    });
    return "unknown";
  }
}
