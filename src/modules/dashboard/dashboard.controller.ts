import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import * as Modules from "@/modules"; // ✅ Tüm modülleri otomatik çekiyoruz

export const getDashboardStats = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const stats: Record<string, number> = {};

    const entries = Object.entries(Modules);

    const counts = await Promise.all(
      entries.map(async ([moduleName, moduleObj]) => {
        // 🛡️ Modül içinde "countDocuments" varsa sadece onu say
        if (typeof (moduleObj as any).countDocuments === "function") {
          const count = await (moduleObj as any).countDocuments();
          stats[moduleName] = count;
        }
      })
    );

    // Ek: toplam revenue (Order modülü varsa)
    let totalRevenue = 0;
    if ("Order" in Modules) {
      const revenueAgg = await (Modules.Order as any).aggregate([
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);
      totalRevenue = revenueAgg[0]?.total || 0;
    }

    res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully.",
      stats: {
        ...stats,
        revenue: totalRevenue,
      },
    });
  }
);
