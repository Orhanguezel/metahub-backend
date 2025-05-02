import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { User } from "@/modules/users";
import { Order } from "@/modules/order";
import { Feedback } from "@/modules/feedback";

export const getDailyOverview = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  const [newUsers, newOrders, revenueAgg, feedbacksToday] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: today } }),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Feedback.countDocuments({ createdAt: { $gte: today } }),
  ]);

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
});
