// src/modules/dashboard/dashboard.report.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { User } from "@/modules/users/users.models";
//import { Order } from "@/modules/order/order.models";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// 📈 Get Top 5 Selling Products
export const getTopProducts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Order } = await getTenantModels(req);
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          tenant: { $first: "$tenant" }, // Ensure tenant is included
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
  }
);

// 👥 Get User Role Statistics
export const getUserRoleStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { User } = await getTenantModels(req);
    const userRoles = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          tenant: { $first: "$tenant" }, // Ensure tenant is included
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
  }
);
