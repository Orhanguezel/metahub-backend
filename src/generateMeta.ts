import "dotenv/config";
import { generateMeta } from "./scripts/generateMeta";

// CLI parametre desteği için (örn. --tenant=metahub)
const args = process.argv.slice(2);
let tenant: string | undefined;
args.forEach((arg) => {
  if (arg.startsWith("--tenant=")) {
    tenant = arg.replace("--tenant=", "");
  }
});

(async () => {
  try {
    await generateMeta(tenant);
    console.log("✅ Meta generate tamamlandı!");
    process.exit(0);
  } catch (error) {
    console.error("❌ generateMeta script error:", error);
    process.exit(1);
  }
})();
