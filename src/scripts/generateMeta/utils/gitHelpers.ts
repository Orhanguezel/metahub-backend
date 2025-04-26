// src/scripts/generateMeta/utils/gitHelpers.ts

import { execSync } from "child_process";

export function getGitUser(): string {
  try {
    return execSync("git config user.name").toString().trim();
  } catch {
    console.warn("⚠️ Git user.name not found");
    return "unknown";
  }
}

export function getGitCommitHash(): string {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    console.warn("⚠️ Git commit hash not found");
    return "unknown";
  }
}

