// src/scripts/generateMeta/utils/versionHelpers.ts

import { getGitUser, getGitCommitHash } from "./gitHelpers";
import logger from "@/core/middleware/logger/logger";
import { t as tFn } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

type MetaHistoryEntry = {
  version: string;
  by: string;
  commitHash: string;
  date: string;
  note: string;
};

/**
 * Patch (x.x.x) version'ı artırır.
 */
export function bumpPatchVersion(
  version: string,
  t: typeof tFn = tFn,
  lang: SupportedLocale = getLogLocale()
): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    logger.warn(
      t("meta.version.invalidFormat", lang, translations, { version }) ||
        `⚠️ Invalid version format: ${version}, defaulting to 1.0.0`
    );
    return "1.0.0";
  }
  parts[2]++;
  return parts.join(".");
}

/**
 * Meta dosyasına versiyon ve history güncellemesi ekler.
 */
export function updateMetaVersionLog(
  meta: any,
  note = "Meta auto-generated",
  t: typeof tFn = tFn,
  lang: SupportedLocale = getLogLocale()
): any {
  const now = new Date().toISOString();
  const oldVersion = meta.version || "1.0.0";
  const newVersion = bumpPatchVersion(oldVersion, t, lang);

  const gitUser = getGitUser();
  const gitCommitHash = getGitCommitHash();

  const history: MetaHistoryEntry[] = Array.isArray(meta.history)
    ? meta.history
    : [];

  const alreadyLogged = history.some(
    (entry) => entry.version === newVersion && entry.note === note
  );
  if (!alreadyLogged) {
    history.push({
      version: newVersion,
      by: gitUser,
      commitHash: gitCommitHash,
      date: now,
      note,
    });
    logger.info(
      t("meta.version.bumped", lang, translations, {
        version: newVersion,
        by: gitUser,
      })
    );
  }

  return {
    ...meta,
    version: newVersion,
    updatedBy: {
      username: gitUser,
      commitHash: gitCommitHash,
    },
    commitHash: gitCommitHash,
    lastUpdatedAt: now,
    history,
  };
}
