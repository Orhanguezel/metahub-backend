import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Meta dosyasını günceller: versiyon artışı, tarih, kullanıcı, not.
 */
export function updateMetaFile(moduleName: string, note: string = "Manual update") {
  const metaPath = path.resolve(__dirname, "../meta-configs/metahub", `${moduleName}.meta.json`);
  if (!fs.existsSync(metaPath)) {
    console.error(`❌ Meta file not found: ${metaPath}`);
    return;
  }

  const raw = fs.readFileSync(metaPath, "utf-8");
  const meta = JSON.parse(raw);

  const oldVersion = meta.version || "1.0.0";
  const newVersion = bumpPatchVersion(oldVersion);

  let gitUser = "unknown";
  try {
    gitUser = execSync("git config user.name").toString().trim();
  } catch (err) {
    console.warn("⚠️ Git user.name could not be determined");
  }

  const now = new Date().toISOString();

  meta.version = newVersion;
  meta.updatedBy = gitUser;
  meta.lastUpdatedAt = now;
  meta.history = meta.history || [];
  meta.history.push({
    version: newVersion,
    date: now,
    by: gitUser,
    note,
  });

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`📦 Meta updated for "${moduleName}" → ${newVersion}`);
}

/**
 * Versiyonu otomatik olarak patch düzeyinde artırır.
 * Örn: 1.0.0 → 1.0.1
 */
function bumpPatchVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.0";
  parts[2]++;
  return parts.join(".");
}



/*
// Örnek kullanım
import { updateMetaFile } from "@/tools/metaLogger";

// Blog modülünün versiyonunu artır ve log düş
updateMetaFile("blog", "Added new validation schema");
*/
