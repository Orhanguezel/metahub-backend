import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import User from "../users/users.models";
import {Order} from "../order";

export const getTopProducts = asyncHandler(
  async (_req: Request, res: Response) => {
    const orders = await Order.aggregate([
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
          label: "$productInfo.name",
          value: "$totalSold",
        },
      },
    ]);

    res.status(200).json(orders);
  }
);

export const getUserRoleStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const roles = await User.aggregate([
      {
        $group: {
          _id: "$role",
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          label: "$_id",
          value: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json(roles);
  }
);
