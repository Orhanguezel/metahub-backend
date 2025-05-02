import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import {Order} from "@/modules/order";
import { Product } from "@/modules/product";
import { User } from "@/modules/users";
import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/templates/orderConfirmation";
import { Types } from "mongoose";

// ✅ Sipariş oluştur
export const createOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { items, shippingAddress, totalPrice } = req.body;

  const enrichedItems = [];
  const criticalStockWarnings: string[] = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.product}`);
    }

    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name.en}`);
    }

    product.stock -= item.quantity;
    await product.save();

    if (product.stock <= (product.stockThreshold ?? 5)) {
      criticalStockWarnings.push(`${product.name.tr} → ${product.stock} left`);
    }

    enrichedItems.push({
      product: product._id as Types.ObjectId,
      quantity: item.quantity,
      unitPrice: product.price,
    });
  }

  const order = await Order.create({
    user: req.user?._id || null,
    items: enrichedItems,
    shippingAddress,
    totalPrice,
    paymentMethod: "cash_on_delivery",
    language: req.locale || "en",
  });

  const user = req.user ? await User.findById(req.user._id).select("email") : null;
  const customerEmail = shippingAddress?.email || user?.email || "";

  const htmlToCustomer = orderConfirmationTemplate({
    name: shippingAddress.name,
    itemsList: enrichedItems.map((item) => `• Product ID: ${item.product} – Qty: ${item.quantity}`).join("<br/>"),
    totalPrice,
  });

  await sendEmail({
    to: customerEmail,
    subject: "Order Confirmation",
    html: htmlToCustomer,
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    data: order,
    criticalStockWarnings,
  });
});

// ✅ Sipariş Detayı Getir (kullanıcı kendisi için)
export const getOrderById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const order = await Order.findById(req.params.id).populate("items.product");

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (order.user?.toString() !== req.user?._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to view this order.");
  }

  res.status(200).json({
    success: true,
    message: "Order fetched successfully.",
    data: order,
  });
});

// ✅ Teslimat Adresini Güncelle (kullanıcı kendi siparişi için)
export const updateShippingAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (order.user?.toString() !== req.user?._id.toString()) {
    res.status(403);
    throw new Error("You are not authorized to update this order.");
  }

  const { shippingAddress } = req.body;

  if (!shippingAddress) {
    res.status(400);
    throw new Error("Shipping address is required.");
  }

  order.shippingAddress = {
    ...order.shippingAddress,
    ...shippingAddress,
  };

  await order.save();

  res.status(200).json({
    success: true,
    message: "Shipping address updated successfully.",
    data: order,
  });
});
