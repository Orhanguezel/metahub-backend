import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import type { paymentTypes } from "@/modules/payment";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t } from "@/core/utils/i18n/translate";
import paymentTranslations from "@/modules/payment/i18n";
import type { SupportedLocale } from "@/types/common";

function paymentT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, paymentTranslations, vars);
}

// --- Örnek locale belirleme ---
function getLocale(req: Request): SupportedLocale {
  // Eğer req.locale varsa, onu kullan
  // Aksi halde, query parametresinden 'lang' varsa onu kullan
  // Yoksa varsayılan olarak 'en' kullan
  return;
  (req.locale as SupportedLocale) || req.query.lang || "en";
}

// ✅ Yeni ödeme oluştur
export const createPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { order, amount, method, currency = "EUR", details } = req.body;
    const { Payment, Order } = await getTenantModels(req);

    if (!order || !amount || !method) {
      res.status(400).json({
        success: false,
        message: paymentT("payment.required_fields", locale),
      });
      return;
    }

    if (!isValidObjectId(order)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_order_id", locale),
        });
      return;
    }

    const payment = await Payment.create({
      order,
      tenant: req.tenant,
      amount,
      method,
      currency,
      status: "pending",
      language: locale,
      details,
    });

    await Order.findByIdAndUpdate(order, {
      $push: { payments: payment._id },
    });

    res.status(201).json({
      success: true,
      message: paymentT("payment.create.success", locale),
      data: payment,
    });
  }
);

// ✅ Tüm ödemeleri getir (admin)
export const getAllPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { Payment } = await getTenantModels(req);
    const payments = await Payment.find({ tenant: req.tenant })
      .populate("order")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: paymentT("payment.list.success", locale),
      data: payments,
    });
  }
);

// ✅ Sipariş ID ile ödeme getir
export const getPaymentByOrderId = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { Payment } = await getTenantModels(req);
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_order_id", locale),
        });
      return;
    }

    const payment = await Payment.findOne({
      order: orderId,
      tenant: req.tenant,
    }).populate("order");

    if (!payment) {
      res
        .status(404)
        .json({
          success: false,
          message: paymentT("payment.not_found_for_order", locale),
        });
      return;
    }

    res.status(200).json({
      success: true,
      message: paymentT("payment.fetched", locale),
      data: payment,
    });
  }
);

// ✅ Kullanıcı kendi ödemesini ID ile görebilir
export const getUserPaymentById = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { Payment } = await getTenantModels(req);
    const userId = req.user?.id;
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_payment_id", locale),
        });
      return;
    }

    // Sadece kullanıcının kendi ödemesi!
    const payment = await Payment.findOne({
      _id: paymentId,
      tenant: req.tenant,
    }).populate({
      path: "order",
      match: { user: userId },
    });

    if (!payment || !payment.order) {
      res
        .status(404)
        .json({
          success: false,
          message: paymentT("payment.not_found", locale),
        });
      return;
    }

    res.status(200).json({
      success: true,
      message: paymentT("payment.fetched", locale),
      data: payment,
    });
  }
);

// ✅ Ödemeyi "paid" yap
export const markPaymentAsPaid = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { Payment } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_payment_id", locale),
        });
      return;
    }

    const payment = await Payment.findOne({ _id: id, tenant: req.tenant });

    if (!payment) {
      res
        .status(404)
        .json({
          success: false,
          message: paymentT("payment.not_found", locale),
        });
      return;
    }

    payment.status = "paid";
    payment.paidAt = new Date();
    await payment.save();

    res.status(200).json({
      success: true,
      message: paymentT("payment.marked_paid", locale),
      data: payment,
    });
  }
);

// ✅ Ödemeyi "failed" yap
export const markPaymentAsFailed = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { Payment } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_payment_id", locale),
        });
      return;
    }

    const payment = await Payment.findOne({ _id: id, tenant: req.tenant });

    if (!payment) {
      res
        .status(404)
        .json({
          success: false,
          message: paymentT("payment.not_found", locale),
        });
      return;
    }

    payment.status = "failed";
    await payment.save();

    res.status(200).json({
      success: true,
      message: paymentT("payment.marked_failed", locale),
      data: payment,
    });
  }
);

// ✅ Ödeme yöntemini güncelle
export const updatePaymentMethod = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { Payment } = await getTenantModels(req);
    const { id } = req.params;
    const { method }: { method: paymentTypes.PaymentMethod } = req.body;

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_payment_id", locale),
        });
      return;
    }

    const validMethods: paymentTypes.PaymentMethod[] = [
      "cash_on_delivery",
      "credit_card",
      "paypal",
    ];
    if (!validMethods.includes(method)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_method", locale),
        });
      return;
    }

    const payment = await Payment.findOne({ _id: id, tenant: req.tenant });

    if (!payment) {
      res
        .status(404)
        .json({
          success: false,
          message: paymentT("payment.not_found", locale),
        });
      return;
    }

    payment.method = method;
    await payment.save();

    res.status(200).json({
      success: true,
      message: paymentT("payment.method_updated", locale),
      data: payment,
    });
  }
);

// ✅ Kullanıcının tüm ödemeleri
export const getPaymentsByUser = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    const { Payment } = await getTenantModels(req);
    const userId = req.user?.id;

    if (!userId || !isValidObjectId(userId)) {
      res
        .status(400)
        .json({
          success: false,
          message: paymentT("payment.invalid_user_id", locale),
        });
      return;
    }

    const payments = await Payment.find({ tenant: req.tenant }).populate({
      path: "order",
      match: { user: userId },
    });

    const filteredPayments = payments.filter((p) => p.order !== null);

    res.status(200).json({
      success: true,
      message: paymentT("payment.list.user", locale),
      data: filteredPayments,
    });
  }
);

// 🧪 Simülasyonlar
export const simulateStripePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    res.status(200).json({
      success: true,
      message: paymentT("payment.simulate.stripe", locale),
    });
  }
);

export const simulatePayPalPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = getLocale(req);
    res.status(200).json({
      success: true,
      message: paymentT("payment.simulate.paypal", locale),
    });
  }
);
