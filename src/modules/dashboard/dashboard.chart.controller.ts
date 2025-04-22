import { Request, Response } from "express";
import asyncHandler from "express-async-handler"; // 📊 Aylık sipariş sayısı (son 12 ay)
import Order from "../../modules/order/order.models";

export const getMonthlyOrders = asyncHandler(
  async (_req: Request, res: Response) => {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formatted = Array.from({ length: 12 }, (_, i) => {
      const found = orders.find((o) => o._id === i + 1);
      return {
        month: new Date(0, i).toLocaleString("default", { month: "short" }),
        total: found?.total || 0,
      };
    });

    res.status(200).json(formatted);
  }
);

// 📊 Aylık gelir (son 12 ay)
export const getMonthlyRevenue = asyncHandler(
  async (_req: Request, res: Response) => {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formatted = Array.from({ length: 12 }, (_, i) => {
      const found = orders.find((o) => o._id === i + 1);
      return {
        month: new Date(0, i).toLocaleString("default", { month: "short" }),
        total: found?.total || 0,
      };
    });

    res.status(200).json(formatted);
  }
);
