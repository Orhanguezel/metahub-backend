// src/modules/dashboard/dashboard.report.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { User } from "@/modules/users/users.models";
import { Order } from "@/modules/order/order.models";

// 📈 Get Top 5 Selling Products
export const getTopProducts = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const topProducts = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $project: {
        _id: 0,
        productId: "$productInfo._id",
        name: "$productInfo.name",
        totalSold: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: "Top selling products fetched successfully.",
    data: topProducts,
  });
});

// 👥 Get User Role Statistics
export const getUserRoleStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const userRoles = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        role: "$_id",
        count: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: "User role statistics fetched successfully.",
    data: userRoles,
  });
});
