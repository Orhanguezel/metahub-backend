import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Order } from "@/modules/order";


// ✅ Tüm Siparişleri Listele
export const getAllOrders = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { lang } = req.query;
  const filter: any = {};

  if (lang) {
    filter.language = lang;
  }

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Orders fetched successfully.",
    data: orders,
  });
});

// ✅ Sipariş Durumunu Güncelle
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { status } = req.body;

  const validStatuses = ["pending", "preparing", "shipped", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid order status.");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.status = status;
  await order.save();

  res.status(200).json({
    success: true,
    message: "Order status updated successfully.",
    data: order,
  });
});

// ✅ Siparişi Teslim Edildi Olarak İşaretle
export const markOrderAsDelivered = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.isDelivered = true;
  order.deliveredAt = new Date();
  await order.save();

  res.status(200).json({
    success: true,
    message: "Order marked as delivered.",
    data: order,
  });
});

// ✅ Siparişi Sil
export const deleteOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    message: "Order deleted successfully.",
  });
});
