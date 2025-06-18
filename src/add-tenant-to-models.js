// add-tenant-to-models.js
const fs = require("fs");
const path = require("path");

// Hangi klasörlerde arama yapacak
const BASE_DIR = path.join(__dirname, "modules");

// Regex ile "new Schema({" veya "const XSchema = new Schema({" bulur
const SCHEMA_REGEX = /(new Schema\s*\(\s*{)|(Schema\s*=\s*new Schema\s*\(\s*{)/;

// Eklemek istediğin satır
const TENANT_LINE =
  "    tenant: { type: String, required: true, index: true },\n";

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Her "new Schema({" bulduğunda hemen alt satıra ekler
  content = content.replace(SCHEMA_REGEX, (match) => {
    // Mevcutta zaten tenant alanı var mı?
    const nextTen = content
      .slice(content.indexOf(match), content.indexOf(match) + 300)
      .includes("tenant:");
    if (nextTen) return match; // Zaten varsa elleme
    changed = true;
    return match + "\n" + TENANT_LINE;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("✅ Güncellendi:", filePath);
  }
}

function walk(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (file.endsWith(".models.ts")) {
      processFile(full);
    }
  });
}

// Çalıştır
walk(BASE_DIR);

console.log("🎉 Tüm modellerde tenant alanı kontrolü tamamlandı.");
