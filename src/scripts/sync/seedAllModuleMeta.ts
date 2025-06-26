import fs from "fs";
import path from "path";
import { ModuleMeta } from "@/modules/modules/admin.models";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";

// Sadece meta alanları
const DEFAULT_META = {
  icon: "box",
  enabled: true,
  roles: ["admin"],
  language: "en",
  version: "1.0.0",
  order: 0,
  routes: [],
  history: [],
  statsKey: "",
};

async function seedAllModuleMeta() {
  const modulesDir = path.resolve(process.cwd(), "src/modules");
  const modules = fs
    .readdirSync(modulesDir)
    .filter((f) => fs.statSync(path.join(modulesDir, f)).isDirectory());

  for (const moduleName of modules) {
    const exists = await ModuleMeta.findOne({ name: moduleName });
    if (!exists) {
      const label = fillAllLocales(moduleName);
      await ModuleMeta.create({
        name: moduleName,
        label,
        ...DEFAULT_META,
      });
      console.log(`[META] ${moduleName} meta kaydı eklendi`);
    }
  }
}

export { seedAllModuleMeta };
