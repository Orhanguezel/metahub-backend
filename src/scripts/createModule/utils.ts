// src/tools/utils/getPaths.ts

import path from "path";

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getPaths(moduleName: string) {
  const metaConfigPath = process.env.META_CONFIG_PATH;

  if (!metaConfigPath) {
    throw new Error("❌ META_CONFIG_PATH is not defined in environment.");
  }

  const modulesPath = path.resolve(process.cwd(), "src/modules");
  const metaPath = path.resolve(process.cwd(), metaConfigPath, `${moduleName}.meta.json`);
  const modulePath = path.join(modulesPath, moduleName);

  return { modulesPath, metaPath, modulePath };
}
