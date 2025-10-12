import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

/**
 * ENABLED_MODULES env'inden modül listesini alır ve ilgili meta klasöründe var olanları filtreler.
 * - APP_ENV ve META_CONFIG_PATH zorunlu değildir; yoksa uyarı loglanır ve boş liste döner.
 * - META_CONFIG_PATH klasör yolu olmalı (örn: "src/meta-configs/dev")
 */
export const getEnabledModules = async (): Promise<string[]> => {
  const enabledModulesRaw = process.env.ENABLED_MODULES || "";
  const metaConfigPath = process.env.META_CONFIG_PATH;

  if (!metaConfigPath) {
    console.warn("⚠️ META_CONFIG_PATH is not defined. getEnabledModules() -> []");
    return [];
  }

  const metaDir = path.resolve(process.cwd(), metaConfigPath);
  if (!fsSync.existsSync(metaDir)) {
    console.warn(`⚠️ Meta-config path not found: ${metaDir}`);
    return [];
  }

  const enabledModules = enabledModulesRaw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  // Eğer ENABLED_MODULES boşsa klasördeki tüm *.meta.json dosyaları aktif say
  if (enabledModules.length === 0) {
    const metaFiles = await fs.readdir(metaDir);
    return metaFiles
      .filter((f) => f.endsWith(".meta.json"))
      .map((f) => f.replace(/\.meta\.json$/, ""))
      .sort();
  }

  // ENABLED_MODULES verilmişse, klasörde gerçekten var olanları filtrele
  const metaFiles = await fs.readdir(metaDir);
  const availableModules = metaFiles
    .filter((file) => file.endsWith(".meta.json"))
    .map((file) => file.replace(/\.meta\.json$/, ""));

  const finalList = enabledModules.filter((mod) => {
    const ok = availableModules.includes(mod);
    if (!ok) {
      console.warn(`⚠️ Enabled module "${mod}" has no corresponding meta file in ${metaDir}.`);
    }
    return ok;
  });

  return finalList;
};
