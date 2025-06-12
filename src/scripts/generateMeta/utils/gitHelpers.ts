// src/scripts/generateMeta/utils/gitHelpers.ts

import { execSync } from "child_process";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// Her fonksiyonda tek source of truth!
function getLang(): SupportedLocale {
  return getLogLocale();
}

export function getGitUser(): string {
  const lang = getLang();
  try {
    return execSync("git config user.name").toString().trim();
  } catch {
    logger.warn(t("meta.git.userNotFound", lang, translations));
    return "unknown";
  }
}

export function getGitCommitHash(): string {
  const lang = getLang();
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    logger.warn(t("meta.git.commitNotFound", lang, translations));
    return "unknown";
  }
}
