// src/scripts/generateMeta/utils/versionHelpers.ts

import { getGitUser, getGitCommitHash } from "./gitHelpers";
import logger from "@/core/middleware/logger/logger";
import { t as tFn } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import type { SupportedLocale } from "@/types/common";

/**
 * Meta dosyası versiyon geçmişi için tip.
 */
type MetaHistoryEntry = {
  version: string;
  by: string;
  commitHash: string;
  date: string;
  note: string;
};

/**
 * Patch (x.x.x) version'ı artırır.
 * Her tenant ve log context'i ile.
 * ❗️ tenant parametresi zorunlu!
 */
export function bumpPatchVersion(
  version: string,
  tenant: string,
  t: typeof tFn,
  lang: SupportedLocale
): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    logger.warn(
      t("meta.version.invalidFormat", lang, translations, { version }),
      {
        tenant,
        module: "meta",
        event: "meta.version.bump",
        status: "warning",
        version,
      }
    );
    return "1.0.0";
  }
  parts[2]++;
  return parts.join(".");
}

/**
 * Meta dosyasına versiyon ve history güncellemesi ekler.
 * Her event tenant context ile loglanır.
 * ❗️ tenant parametresi zorunlu!
 */
export function updateMetaVersionLog(
  meta: any,
  note: string,
  tenant: string,
  t: typeof tFn,
  lang: SupportedLocale
): any {
  const now = new Date().toISOString();
  const oldVersion = meta.version || "1.0.0";
  const newVersion = bumpPatchVersion(oldVersion, tenant, t, lang);

  const gitUser = getGitUser();
  const gitCommitHash = getGitCommitHash();

  const history: MetaHistoryEntry[] = Array.isArray(meta.history)
    ? meta.history
    : [];

  // Zaten loglanmışsa tekrar ekleme
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
        tenant,
      }),
      {
        tenant,
        module: "meta",
        event: "meta.version.bumped",
        status: "success",
        version: newVersion,
        by: gitUser,
        commitHash: gitCommitHash,
        note,
      }
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
