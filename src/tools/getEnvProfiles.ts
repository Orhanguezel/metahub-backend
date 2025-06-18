import fs from "fs";
import path from "path";

export const getEnvProfiles = (): string[] => {
  return fs
    .readdirSync(process.cwd())
    .filter((f) => {
      const fullPath = path.join(process.cwd(), f);
      return (
        f.startsWith(".env.") &&
        !f.includes(".local") &&
        fs.statSync(fullPath).isFile()
      );
    })
    .map((f) => f.replace(".env.", "").trim());
};
