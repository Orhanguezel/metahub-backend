// src/modules/dashboard/dashboard.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getDashboardStatsDynamic } from "./dashboard.stats";
//import { User } from "@/modules/users/users.models";
//import { Order } from "@/modules/order/order.models";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// 📊 Dashboard ana istatistikleri (dinamik model sayımı, toplam ciro)
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response) => {
    const { User, Order } = await getTenantModels(req);
    const userCount = await User.countDocuments();
    const orderCount = await Order.countDocuments();
    const revenueAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
          tenant: { $first: "$tenant" },
        },
      },
    ]);
    const stats = await getDashboardStatsDynamic();
    res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully.",
      stats,
    });
  }
);

// 📅 Günlük özet: yeni kullanıcı, yeni sipariş, bugünkü ciro
export const getDailyOverview = asyncHandler(
  async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { User, Order } = await getTenantModels(req);
    const userCount = await User.countDocuments();
    const orderCount = await Order.countDocuments();

    const [newUsers, newOrders, revenueAgg] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" },
            tenant: { $first: "$tenant" },
          },
        },
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
  }
);

// 📈 Son 12 ayın sipariş sayıları
export const getMonthlyOrders = asyncHandler(
  async (req: Request, res: Response) => {
    const { Order } = await getTenantModels(req);
    const orders = await Order.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: 1 },
          tenant: { $first: "$tenant" },
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
  }
);

// 💸 Son 12 ayın geliri
export const getMonthlyRevenue = asyncHandler(
  async (req: Request, res: Response) => {
    const { Order } = await getTenantModels(req);
    const revenue = await Order.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          total: { $sum: "$totalPrice" },
          tenant: { $first: "$tenant" },
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
  }
);
