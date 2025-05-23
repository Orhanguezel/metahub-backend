// src/modules/dashboard/dashboard.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getDashboardStatsDynamic } from "./dashboard.stats";
import { User } from "@/modules/users/users.models";
import { Order } from "@/modules/order/order.models";

// 📊 Dashboard ana istatistikleri (dinamik model sayımı, toplam ciro)
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getDashboardStatsDynamic();
  res.status(200).json({
    success: true,
    message: "Dashboard stats fetched successfully.",
    stats,
  });
});

// 📅 Günlük özet: yeni kullanıcı, yeni sipariş, bugünkü ciro
export const getDailyOverview = asyncHandler(async (_req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [newUsers, newOrders, revenueAgg] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: today } }),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
  ]);

  const revenueToday = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

  res.status(200).json({
    success: true,
    message: "Daily overview data fetched successfully.",
    data: {
      newUsers,
      newOrders,
      revenueToday,
    },
  });
});

// 📈 Son 12 ayın sipariş sayıları
export const getMonthlyOrders = asyncHandler(async (_req: Request, res: Response) => {
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

// 💸 Son 12 ayın geliri
export const getMonthlyRevenue = asyncHandler(async (_req: Request, res: Response) => {
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
