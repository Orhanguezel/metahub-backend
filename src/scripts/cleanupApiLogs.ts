// scripts/cleanupApiLogs.ts
import { ApiKeyLog } from "../../modules/apikeys";
export {}; // dosyayı module olarak tanımlar

await ApiKeyLog.deleteMany({ createdAt: { $lt: Date.now() - 1000 * 60 * 60 * 24 * 30 } }); // 30 gün
