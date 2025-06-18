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
  tenant: string;
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
 * Meta objesini günceller, history loglar, eksik label'ı çoklu dil ile tamamlar.
 * Tüm loglar tenant-aware, i18n ile üretilir.
 *
 * @param meta Meta objesi (label vs. eksik olabilir)
 * @param note Versiyon notu (zorunlu)
 * @param tenant Tenant ismi (zorunlu!)
 * @returns Güncellenmiş meta objesi
 */
export function updateMetaVersionLog(
  meta: any,
  note: string, // ZORUNLU!
  tenant: string // ZORUNLU!
): any {
  if (!tenant || typeof tenant !== "string" || !tenant.trim()) {
    throw new Error("updateMetaVersionLog: tenant parametresi zorunludur!");
  }

  const lang: SupportedLocale = getLogLocale();
  const now = new Date().toISOString();
  const oldVersion = meta.version || "1.0.0";
  const newVersion = bumpPatchVersion(oldVersion);
  const gitUser = getGitUser();

  const history: MetaHistoryEntry[] = Array.isArray(meta.history)
    ? meta.history
    : [];

  // History entry tenant-aware
  const alreadyLogged = history.some(
    (entry) =>
      entry.version === newVersion &&
      entry.note === note &&
      entry.tenant === tenant
  );

  if (!alreadyLogged) {
    history.push({
      version: newVersion,
      by: gitUser,
      date: now,
      note,
      tenant,
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
        note,
      }
    );
  }

  // Eksik label varsa logla ve tamamla
  if (!meta.label) {
    logger.warn(
      t("meta.version.noLabel", lang, translations, {
        name: meta.name,
        tenant,
      }),
      {
        tenant,
        module: "meta",
        event: "meta.version.noLabel",
        status: "warning",
        name: meta.name,
      }
    );
  }

  return {
    ...meta,
    tenant,
    label: meta.label ?? fillAllLocales(meta.name), // Çok dilli label garanti altına alındı
    version: newVersion,
    updatedBy: gitUser,
    lastUpdatedAt: now,
    history,
  };
}
