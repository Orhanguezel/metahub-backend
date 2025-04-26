// src/scripts/generateMeta/utils/versionHelpers.ts

import { getGitUser, getGitCommitHash } from "./gitHelpers";

type MetaHistoryEntry = {
  version: string;
  by: string;
  commitHash: string;
  date: string;
  note: string;
};

export function bumpPatchVersion(version: string): string {
    const parts = version.split(".").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return "1.0.0";
    parts[2]++;
    return parts.join(".");
  }

  export function updateMetaVersionLog(meta: any, note = "Meta auto-generated"): any {
    const now = new Date().toISOString();
    const oldVersion = meta.version || "1.0.0";
    const newVersion = bumpPatchVersion(oldVersion);
  
    const gitUser = getGitUser();
    const gitCommitHash = getGitCommitHash();
  
    const history: MetaHistoryEntry[] = Array.isArray(meta.history) ? meta.history : [];
  
    const alreadyLogged = history.some(entry => entry.version === newVersion && entry.note === note);
    if (!alreadyLogged) {
      history.push({
        version: newVersion,
        by: gitUser,
        commitHash: gitCommitHash,
        date: now,
        note,
      });
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