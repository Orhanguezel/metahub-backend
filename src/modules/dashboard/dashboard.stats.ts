import path from "path";
import fs from "fs";

export async function getDashboardStatsDynamic(): Promise<Record<string, number | undefined>> {
  const MODULES_DIR = path.resolve(__dirname, "..");
  const stats: Record<string, number | undefined> = {};
  let totalRevenue = 0;

  const isCompiled = __filename.endsWith('.js') && !__filename.endsWith('.ts');
  const ext = isCompiled ? ".js" : ".ts";

  const moduleDirs = fs.readdirSync(MODULES_DIR);

  for (const mod of moduleDirs) {
    const modelPath = path.join(MODULES_DIR, mod);
    if (fs.existsSync(modelPath) && fs.statSync(modelPath).isDirectory()) {
      const modelFiles = fs.readdirSync(modelPath)
        .filter((file) => file.endsWith(`.models${ext}`))
        .map((file) => path.join(modelPath, file));
      for (const file of modelFiles) {
        try {
          const mod = require(file); // ESM ise: await import(file)
          for (const [modelName, exported] of Object.entries(mod)) {
            if (exported && typeof (exported as any).countDocuments === "function") {
              const key = modelName.charAt(0).toLowerCase() + modelName.slice(1) + "s";
              stats[key] = await (exported as any).countDocuments();
              if (modelName.toLowerCase() === "order") {
                const revenueAgg = await (exported as any).aggregate([
                  { $group: { _id: null, total: { $sum: "$totalPrice" } } }
                ]);
                totalRevenue = revenueAgg[0]?.total || 0;
              }
            }
          }
        } catch (err) {
          console.warn(`[dashboard.stats] Model import failed for ${file}: ${err.message}`);
        }
      }
    }
  }

  stats.revenue = totalRevenue;
  return stats;
}

