// src/scripts/generateMeta/utils/updateMetaVersion.ts

import { execSync } from "child_process";

type MetaHistoryEntry = {
  version: string;
  by: string;
  date: string;
  note: string;
};

export function bumpPatchVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.0";
  parts[2]++;
  return parts.join(".");
}

export function getGitUser(): string {
  try {
    return execSync("git config user.name").toString().trim();
  } catch {
    console.warn("⚠️ Git user.name not found");
    return "unknown";
  }
}

export function updateMetaVersionLog(meta: any, note = "Meta auto-generated"): any {
  const now = new Date().toISOString();
  const oldVersion = meta.version || "1.0.0";
  const newVersion = bumpPatchVersion(oldVersion);
  const gitUser = getGitUser();

  const history: MetaHistoryEntry[] = Array.isArray(meta.history) ? meta.history : [];

  const alreadyLogged = history.some(entry => entry.version === newVersion && entry.note === note);
  if (!alreadyLogged) {
    history.push({
      version: newVersion,
      by: gitUser,
      date: now,
      note,
    });
  }

  return {
    ...meta,
    version: newVersion,
    updatedBy: gitUser,
    lastUpdatedAt: now,
    history,
  };
}
