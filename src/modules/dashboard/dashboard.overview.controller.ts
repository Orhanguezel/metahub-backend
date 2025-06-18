// src/modules/dashboard/dashboard.overview.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { User } from "@/modules/users/users.models";
//import { Order } from "@/modules/order/order.models";
//import { Feedback } from "@/modules/feedback/feedback.models";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

export const getDailyOverview = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { User, Order, Feedback } = await getTenantModels(req);
    const [newUsers, newOrders, revenueAgg, feedbacksToday] = await Promise.all(
      [
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
        Feedback.countDocuments({ createdAt: { $gte: today } }),
      ]
    );

    const revenueToday = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.status(200).json({
      success: true,
      message: "Daily overview data fetched successfully.",
      data: {
        newUsers,
        newOrders,
        revenueToday,
        feedbacksToday,
      },
    });
  }
);
