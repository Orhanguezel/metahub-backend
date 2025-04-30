// scripts/cleanupApiLogs.ts
await ApiKeyLog.deleteMany({ createdAt: { $lt: Date.now() - 1000 * 60 * 60 * 24 * 30 } }); // 30 gün
