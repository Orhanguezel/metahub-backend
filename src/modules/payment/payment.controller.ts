import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { Payment} from "@/modules/payment";
import type { paymentTypes } from "@/modules/payment";
import { Order } from "@/modules/order";

// ✅ Yeni ödeme oluştur
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const { order, amount, method, currency = "EUR", details } = req.body;

  if (!order || !amount || !method) {
    res.status(400).json({ success: false, message: "Order, amount, and payment method are required." });
    return;
  }

  if (!isValidObjectId(order)) {
    res.status(400).json({ success: false, message: "Invalid order ID." });
    return;
  }

  const payment = await Payment.create({
    order,
    amount,
    method,
    currency,
    status: "pending",
    language: req.locale || "en",
    details,
  });

  await Order.findByIdAndUpdate(order, {
    $push: { payments: payment._id }
  });

  res.status(201).json({
    success: true,
    message: "Payment created successfully.",
    data: payment,
  });
});

// ✅ Tüm ödemeleri getir (admin)
export const getAllPayments = asyncHandler(async (_req: Request, res: Response) => {
  const payments = await Payment.find()
    .populate("order")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "All payments fetched successfully.",
    data: payments,
  });
});

// ✅ Sipariş ID ile ödeme getir
export const getPaymentByOrderId = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (!isValidObjectId(orderId)) {
    res.status(400).json({ success: false, message: "Invalid order ID." });
    return;
  }

  const payment = await Payment.findOne({ order: orderId }).populate("order");

  if (!payment) {
    res.status(404).json({ success: false, message: "Payment not found for this order." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Payment fetched successfully.",
    data: payment,
  });
});

// ✅ Ödemeyi "paid" yap
export const markPaymentAsPaid = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid payment ID." });
    return;
  }

  const payment = await Payment.findById(id);

  if (!payment) {
    res.status(404).json({ success: false, message: "Payment not found." });
    return;
  }

  payment.status = "paid";
  payment.paidAt = new Date();
  await payment.save();

  res.status(200).json({
    success: true,
    message: "Payment marked as paid.",
    data: payment,
  });
});

// ✅ Ödemeyi "failed" yap
export const markPaymentAsFailed = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid payment ID." });
    return;
  }

  const payment = await Payment.findById(id);

  if (!payment) {
    res.status(404).json({ success: false, message: "Payment not found." });
    return;
  }

  payment.status = "failed";
  await payment.save();

  res.status(200).json({
    success: true,
    message: "Payment marked as failed.",
    data: payment,
  });
});

// ✅ Ödeme yöntemini güncelle
export const updatePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { method }: { method: paymentTypes.PaymentMethod } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid payment ID." });
    return;
  }

  const validMethods: paymentTypes.PaymentMethod[] = ["cash_on_delivery", "credit_card", "paypal"];
  if (!validMethods.includes(method)) {
    res.status(400).json({ success: false, message: "Invalid payment method." });
    return;
  }

  const payment = await Payment.findById(id);

  if (!payment) {
    res.status(404).json({ success: false, message: "Payment not found." });
    return;
  }

  payment.method = method;
  await payment.save();

  res.status(200).json({
    success: true,
    message: "Payment method updated successfully.",
    data: payment,
  });
});

// ✅ Kullanıcının ödemeleri
export const getPaymentsByUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId || !isValidObjectId(userId)) {
    res.status(400).json({ success: false, message: "Invalid user ID." });
    return;
  }

  const payments = await Payment.find()
    .populate({
      path: "order",
      match: { user: userId },
    });

  const filteredPayments = payments.filter((p) => p.order !== null);

  res.status(200).json({
    success: true,
    message: "User payments fetched successfully.",
    data: filteredPayments,
  });
});

// 🧪 Stripe/PayPal Ödeme Simülasyonu
export const simulateStripePayment = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Stripe payment simulated successfully.",
  });
});

export const simulatePayPalPayment = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "PayPal payment simulated successfully.",
  });
});
