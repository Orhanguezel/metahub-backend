const fs = require("fs");
const path = require("path");

const modulesPath = path.join(__dirname, "src", "modules");
const missingTenant = [];

function checkSchema(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    // Sadece Schema olan dosyaları al
    if (content.includes("new Schema") && !content.includes("tenant:")) {
        missingTenant.push(filePath);
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath);
        } else if (
            file.endsWith(".models.ts") ||
            file.endsWith(".model.ts") ||
            file.endsWith(".models.js") ||
            file.endsWith(".model.js")
        ) {
            checkSchema(filePath);
        }
    });
}

walk(modulesPath);

if (missingTenant.length) {
    console.log("🚨 Tenant alanı eksik olan modeller:");
    missingTenant.forEach((file) => console.log(file));
} else {
    console.log("✅ Tüm modellerde tenant alanı var.");
}
console.log("Kontrol tamamlandı.");
