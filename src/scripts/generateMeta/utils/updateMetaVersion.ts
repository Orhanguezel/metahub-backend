// src/scripts/generateMeta/utils/updateMetaVersion.ts
import { execSync } from "child_process";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale } from "@/types/common";

type MetaHistoryEntry = {
  version: string;
  by: string;
  date: string;
  note: string;
};

function bumpPatchVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.0";
  parts[2]++;
  return parts.join(".");
}

function getGitUser(): string {
  const lang = getLogLocale();
  try {
    return execSync("git config user.name").toString().trim();
  } catch {
    logger.warn(t("meta.git.userNotFound", lang, translations));
    return "unknown";
  }
}

/**
 * Güncellenmiş meta objesi döner, eksik `label` varsa otomatik doldurur.
 * @param meta Meta objesi
 * @param note Versiyon notu
 * @returns Güncellenmiş meta objesi
 */
export function updateMetaVersionLog(
  meta: any,
  note = "Meta auto-generated"
): any {
  const lang = getLogLocale();
  const now = new Date().toISOString();
  const oldVersion = meta.version || "1.0.0";
  const newVersion = bumpPatchVersion(oldVersion);
  const gitUser = getGitUser();

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
    label: meta.label ?? fillAllLocales(meta.name), // 🔐 Çok dilli label garanti altına alındı
    version: newVersion,
    updatedBy: gitUser,
    lastUpdatedAt: now,
    history,
  };
}
