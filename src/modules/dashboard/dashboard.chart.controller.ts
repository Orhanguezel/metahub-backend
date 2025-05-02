import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Order } from "@/modules/order";

// 📊 Aylık sipariş sayıları (son 12 ay)
export const getMonthlyOrders = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
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
      totalOrders: found?.total || 0,
    };
  });

  res.status(200).json({
    success: true,
    message: "Monthly order stats fetched successfully.",
    data: formatted,
  });
});

// 📊 Aylık gelir (son 12 ay)
export const getMonthlyRevenue = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const revenue = await Order.aggregate([
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: "$totalPrice" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const formatted = Array.from({ length: 12 }, (_, i) => {
    const found = revenue.find((o) => o._id === i + 1);
    return {
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      totalRevenue: found?.total || 0,
    };
  });

  res.status(200).json({
    success: true,
    message: "Monthly revenue stats fetched successfully.",
    data: formatted,
  });
});
