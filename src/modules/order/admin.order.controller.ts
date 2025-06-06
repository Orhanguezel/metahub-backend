import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Order } from "@/modules/order";
import { User } from "@/modules/users";
import { Notification } from "@/modules/notification";
import { sendEmail } from "@/services/emailService";


export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
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


export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;

  const validStatuses = ["pending", "preparing", "shipped", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid order status.");
  }

  const order = await Order.findById(req.params.id).populate("user", "name email language");
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.status = status;
  await order.save();


  if (order.user && typeof order.user === "object" && "email" in order.user) {
    const user = order.user as { email: string; name?: string; language?: string };
    const locale = (user.language as "tr" | "en" | "de") || "en";
    const statusMsg = {
      pending: { en: "Order is pending.", de: "Bestellung ist ausstehend.", tr: "Sipariş beklemede." },
      preparing: { en: "Order is being prepared.", de: "Bestellung wird vorbereitet.", tr: "Sipariş hazırlanıyor." },
      shipped: { en: "Order has been shipped.", de: "Bestellung wurde versandt.", tr: "Sipariş kargoya verildi." },
      completed: { en: "Order completed.", de: "Bestellung abgeschlossen.", tr: "Sipariş tamamlandı." },
      cancelled: { en: "Order cancelled.", de: "Bestellung storniert.", tr: "Sipariş iptal edildi." }
    }[status];

    // Notification ekle
    await Notification.create({
      user: order.user._id || order.user, 
      type: "success",
      message: statusMsg?.[locale] || statusMsg?.en,
      data: { orderId: order._id, newStatus: status },
      language: locale,
    });

    // İstenirse mail de eklenebilir:
    // await sendEmail({
    //   to: user.email,
    //   subject: "Order Status Updated",
    //   html: `<p>${statusMsg?.[locale] || statusMsg?.en}</p>`,
    // });
  }

  res.status(200).json({
    success: true,
    message: "Order status updated successfully.",
    data: order,
  });
});


export const markOrderAsDelivered = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id).populate("user", "name email language");
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.isDelivered = true;
  order.deliveredAt = new Date();
  await order.save();

 
  if (order.user && typeof order.user === "object" && "email" in order.user) {
    const user = order.user as { email: string; name?: string; language?: string };
    const locale = (user.language as "tr" | "en" | "de") || "en";
    await Notification.create({
      user: order.user._id || order.user,
      type: "success",
      message: {
        en: "Your order has been delivered.",
        de: "Ihre Bestellung wurde geliefert.",
        tr: "Siparişiniz teslim edildi.",
      }[locale],
      data: { orderId: order._id },
      language: locale,
    });
    // await sendEmail({ ... })
  }

  res.status(200).json({
    success: true,
    message: "Order marked as delivered.",
    data: order,
  });
});


export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
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
