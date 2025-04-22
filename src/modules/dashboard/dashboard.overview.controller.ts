import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../users/users.models";
import Order from "../../modules/order/order.models";
import Feedback from "../../modules/feedback/feedback.models";

export const getDailyOverview = asyncHandler(
  async (_req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newUsers, newOrders, revenueToday, feedbacksToday] =
      await Promise.all([
        User.countDocuments({ createdAt: { $gte: today } }),
        Order.countDocuments({ createdAt: { $gte: today } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } },
        ]),
        Feedback.countDocuments({ createdAt: { $gte: today } }),
      ]);

    res.status(200).json({
      newUsers,
      newOrders,
      revenueToday: revenueToday[0]?.total || 0,
      feedbacksToday,
    });
  }
);
