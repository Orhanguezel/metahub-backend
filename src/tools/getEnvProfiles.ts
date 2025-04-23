import fs from "fs";
import path from "path";


export const getEnvProfiles = (): string[] => {
  return fs
    .readdirSync(process.cwd())
    .filter((f) => f.startsWith(".env.") && !f.endsWith(".local"))
    .map((f) => f.replace(".env.", "").trim());
};
