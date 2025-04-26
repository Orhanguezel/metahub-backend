import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import Payment, { PaymentMethod } from "./payment.models";
import Order from "../order/order.models";

// 💳 Yeni ödeme oluştur
export const createPayment = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { order, amount, method }: { order: string; amount: number; method: PaymentMethod } = req.body;

    if (!order || !amount || !method) {
      res.status(400).json({ message: "Order, amount, and payment method are required." });
      return;
    }

    if (!isValidObjectId(order)) {
      res.status(400).json({ message: "Invalid order ID." });
      return;
    }

    const payment = await Payment.create({
      order,
      amount,
      method,
      status: "pending",
      language: req.locale || "en",
    });

    res.status(201).json({
      success: true,
      message: "Payment created successfully.",
      payment,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// 📋 Tüm ödemeleri getir (admin)
export const getAllPayments = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payments = await Payment.find()
      .populate("order")
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
    return;
  } catch (error) {
    next(error);
  }
});

// 🔍 Sipariş ID ile ödeme getir
export const getPaymentByOrderId = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      res.status(400).json({ message: "Invalid order ID." });
      return;
    }

    const payment = await Payment.findOne({ order: orderId }).populate("order");

    if (!payment) {
      res.status(404).json({ message: "Payment not found for this order." });
      return;
    }

    res.status(200).json(payment);
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Ödemeyi "paid" yap
export const markPaymentAsPaid = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid payment ID." });
      return;
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ message: "Payment not found." });
      return;
    }

    payment.status = "paid";
    payment.paidAt = new Date();
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment marked as paid.",
      payment,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ❌ Ödemeyi "failed" yap
export const markPaymentAsFailed = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid payment ID." });
      return;
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ message: "Payment not found." });
      return;
    }

    payment.status = "failed";
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment marked as failed.",
      payment,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// 🔁 Ödeme yöntemini güncelle
export const updatePaymentMethod = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { method }: { method: PaymentMethod } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid payment ID." });
      return;
    }

    const validMethods: PaymentMethod[] = ["cash_on_delivery", "credit_card", "paypal"];
    if (!validMethods.includes(method)) {
      res.status(400).json({ message: "Invalid payment method." });
      return;
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      res.status(404).json({ message: "Payment not found." });
      return;
    }

    payment.method = method;
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment method updated.",
      payment,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// 👤 Kullanıcıya ait ödemeleri getir
export const getPaymentsByUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId || !isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    const payments = await Payment.find({})
      .populate({
        path: "order",
        match: { user: userId },
      });

    const filteredPayments = payments.filter((p) => p.order !== null);

    res.status(200).json(filteredPayments);
    return;
  } catch (error) {
    next(error);
  }
});

// 🧪 Stripe ödeme simülasyonu
export const simulateStripePayment = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: "Stripe payment simulated successfully.",
  });
  return;
});

// 🧪 PayPal ödeme simülasyonu
export const simulatePayPalPayment = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: "PayPal payment simulated successfully.",
  });
  return;
});
