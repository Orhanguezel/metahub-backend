import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Payment from "./payment.models";
import { Types } from "mongoose";

// 💳 Yeni ödeme oluştur
export const createPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { order, amount, method } = req.body;

    if (!order || !amount || !method) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Bestellung, Betrag und Zahlungsmethode sind erforderlich."
            : req.locale === "tr"
            ? "Sipariş, tutar ve ödeme yöntemi gereklidir."
            : "Order, amount and method are required.",
      });
      return;
    }

    const payment = await Payment.create({
      order,
      amount,
      method,
      status: "pending",
    });

    res.status(201).json({
      message:
        req.locale === "de"
          ? "Zahlung erfolgreich erstellt."
          : req.locale === "tr"
          ? "Ödeme başarıyla oluşturuldu."
          : "Payment created.",
      payment,
    });
  }
);

// 📋 Tüm ödemeleri getir (admin)
export const getAllPayments = asyncHandler(
  async (_req: Request, res: Response) => {
    const payments = await Payment.find()
      .populate("order")
      .sort({ createdAt: -1 });
    res.json(payments);
  }
);

// 🔍 Belirli sipariş için ödeme
export const getPaymentByOrderId = asyncHandler(
  async (req: Request, res: Response) => {
    const payment = await Payment.findOne({
      order: req.params.orderId,
    }).populate("order");
    if (!payment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Für diese Bestellung wurde keine Zahlung gefunden."
            : req.locale === "tr"
            ? "Bu siparişe ait ödeme bulunamadı."
            : "Payment not found for this order.",
      });
      return;
    }

    res.json(payment);
  }
);

// ✅ Ödemeyi "ödendi" olarak işaretle
export const markPaymentAsPaid = asyncHandler(
  async (req: Request, res: Response) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Zahlung nicht gefunden."
            : req.locale === "tr"
            ? "Ödeme bulunamadı."
            : "Payment not found.",
      });
      return;
    }

    payment.status = "paid";
    payment.paidAt = new Date();
    await payment.save();

    res.json({
      message:
        req.locale === "de"
          ? "Zahlung als bezahlt markiert."
          : req.locale === "tr"
          ? "Ödeme ödendi olarak işaretlendi."
          : "Payment marked as paid.",
      payment,
    });
  }
);

// ❌ Ödemeyi "başarısız" olarak işaretle
export const markPaymentAsFailed = asyncHandler(
  async (req: Request, res: Response) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Zahlung nicht gefunden."
            : req.locale === "tr"
            ? "Ödeme bulunamadı."
            : "Payment not found.",
      });
      return;
    }

    payment.status = "failed";
    await payment.save();

    res.json({
      message:
        req.locale === "de"
          ? "Zahlung als fehlgeschlagen markiert."
          : req.locale === "tr"
          ? "Ödeme başarısız olarak işaretlendi."
          : "Payment marked as failed.",
      payment,
    });
  }
);

// 🔁 Ödeme yöntemini güncelle
export const updatePaymentMethod = asyncHandler(
  async (req: Request, res: Response) => {
    const { method } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Zahlung nicht gefunden."
            : req.locale === "tr"
            ? "Ödeme bulunamadı."
            : "Payment not found.",
      });
      return;
    }

    const validMethods = ["cash_on_delivery", "credit_card", "paypal"];
    if (!validMethods.includes(method)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Zahlungsmethode."
            : req.locale === "tr"
            ? "Geçersiz ödeme yöntemi."
            : "Invalid payment method.",
      });
      return;
    }

    payment.method = method;
    await payment.save();

    res.json({
      message:
        req.locale === "de"
          ? "Zahlungsmethode aktualisiert."
          : req.locale === "tr"
          ? "Ödeme yöntemi güncellendi."
          : "Payment method updated.",
      payment,
    });
  }
);

// 👤 Kullanıcıya ait ödemeler
export const getPaymentsByUser = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Benutzer-ID."
            : req.locale === "tr"
            ? "Geçersiz kullanıcı ID'si."
            : "Invalid user ID.",
      });
      return;
    }

    const payments = await Payment.find({}).populate({
      path: "order",
      match: { user: userId },
    });

    const filtered = payments.filter((p) => p.order !== null);
    res.json(filtered);
  }
);

// 🧪 Stripe simülasyonu
export const simulateStripePayment = asyncHandler(
  async (_req: Request, res: Response) => {
    res.json({
      message:
        _req.locale === "de"
          ? "Stripe-Zahlung simuliert."
          : _req.locale === "tr"
          ? "Stripe ödemesi simüle edildi."
          : "Stripe payment processed (simulated).",
    });
  }
);

// 🧪 PayPal simülasyonu
export const simulatePayPalPayment = asyncHandler(
  async (_req: Request, res: Response) => {
    res.json({
      message:
        _req.locale === "de"
          ? "PayPal-Zahlung simuliert."
          : _req.locale === "tr"
          ? "PayPal ödemesi simüle edildi."
          : "PayPal payment processed (simulated).",
    });
  }
);
