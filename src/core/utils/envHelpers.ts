// src/utils/envHelpers.ts

export const getEnabledModulesFromEnv = (): string[] => {
  const raw = process.env.ENABLED_MODULES || "";
  return raw.split(",").map((mod) => mod.trim()).filter(Boolean);
};
