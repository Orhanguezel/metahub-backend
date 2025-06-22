import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/modules/order/templates/orderConfirmation";
import type { SupportedLocale } from "@/types/common";
import { t } from "@/core/utils/i18n/translate";
import orderTranslations from "@/modules/order/i18n";
import logger from "@/core/middleware/logger/logger";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// i18n kısa yol fonksiyonu
function orderT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, orderTranslations, vars);
}

// 🟢 Sipariş Oluştur
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const { items, addressId, shippingAddress, paymentMethod, couponCode } =
    req.body;
  const userId = req.user?._id;
  const userName = req.user?.name || "";
  const reqLocale: SupportedLocale = req.locale || "en";

  // 1️⃣ Adres bul/gönder
  let shippingAddressWithTenant;

  if (addressId) {
    const { Address } = await getTenantModels(req);
    const addressDoc = await Address.findOne({
      _id: addressId,
      tenant: req.tenant,
    }).lean();
    if (!addressDoc) {
      logger.warn(orderT("error.addressNotFound", reqLocale));
      res.status(400).json({
        success: false,
        message: orderT("error.addressNotFound", reqLocale),
      });
      return;
    }
    shippingAddressWithTenant = {
      name: userName,
      tenant: req.tenant,
      phone: addressDoc.phone,
      email: addressDoc.email,
      street: addressDoc.street,
      city: addressDoc.city,
      postalCode: addressDoc.zipCode,
      country: addressDoc.country || "Germany",
      ...(shippingAddress || {}),
    };
  } else {
    shippingAddressWithTenant = {
      ...shippingAddress,
      tenant: req.tenant,
    };
  }

  if (
    !shippingAddressWithTenant ||
    !shippingAddressWithTenant.name ||
    !shippingAddressWithTenant.phone ||
    !shippingAddressWithTenant.email ||
    !shippingAddressWithTenant.street ||
    !shippingAddressWithTenant.city ||
    !shippingAddressWithTenant.postalCode ||
    !shippingAddressWithTenant.country
  ) {
    logger.warn(orderT("error.shippingAddressRequired", reqLocale));
    res.status(400).json({
      success: false,
      message: orderT("error.shippingAddressRequired", reqLocale),
      redirect: "/account",
    });
    return;
  }

  // 2️⃣ Ürün doğrulama ve fiyat
  let total = 0;
  const enrichedItems: any[] = [];
  const criticalStockWarnings: string[] = [];
  const itemsForMail: string[] = [];

  for (const item of items) {
    const { Bike } = await getTenantModels(req);
    const product = await Bike.findOne({
      _id: item.product,
      tenant: req.tenant,
    });
    if (!product) {
      logger.warn(orderT("error.productNotFound", reqLocale));
      res.status(404).json({
        success: false,
        message: orderT("error.productNotFound", reqLocale),
      });
      return;
    }
    if (product.stock < item.quantity) {
      logger.warn(orderT("error.insufficientStock", reqLocale));
      res.status(400).json({
        success: false,
        message: orderT("error.insufficientStock", reqLocale),
      });
      return;
    }
    product.stock -= item.quantity;
    await product.save();

    if (product.stock <= (product.stockThreshold ?? 5)) {
      criticalStockWarnings.push(
        orderT("warning.lowStock", reqLocale, {
          name:
            product.name?.[reqLocale] ||
            product.name?.en ||
            String(product._id),
          stock: String(product.stock),
        })
      );
    }
    enrichedItems.push({
      product: product._id,
      quantity: item.quantity,
      unitPrice: product.price,
      tenant: req.tenant,
    });
    itemsForMail.push(
      `• ${
        product.name?.[reqLocale] || product.name?.en || String(product._id)
      } – Qty: ${item.quantity}`
    );
    total += product.price * item.quantity;
  }

  // 3️⃣ Kupon
  let discount = 0;
  let coupon = null;
  if (couponCode) {
    const { Coupon } = await getTenantModels(req);
    coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true,
      tenant: req.tenant,
      expiresAt: { $gte: new Date() },
    });
    if (coupon) {
      discount = Math.round(total * (coupon.discount / 100));
    } else {
      logger.warn(orderT("error.invalidCoupon", reqLocale));
      res.status(400).json({
        success: false,
        message: orderT("error.invalidCoupon", reqLocale),
      });
      return;
    }
  }

  // 4️⃣ Payment method kontrol
  const method = (paymentMethod as string) || "cash_on_delivery";
  if (!["cash_on_delivery", "credit_card", "paypal"].includes(method)) {
    logger.warn(orderT("error.invalidPaymentMethod", reqLocale));
    res.status(400).json({
      success: false,
      message: orderT("error.invalidPaymentMethod", reqLocale),
    });
    return;
  }

  // 5️⃣ Siparişi oluştur
  const { Payment } = await getTenantModels(req);
  const { User } = await getTenantModels(req);
  const order = await Order.create({
    user: userId,
    tenant: req.tenant,
    addressId: addressId || undefined,
    items: enrichedItems,
    shippingAddress: shippingAddressWithTenant,
    totalPrice: total,
    discount,
    coupon: coupon?._id,
    paymentMethod: method,
    status: "pending",
    language: reqLocale,
  });

  // 6️⃣ Payment (kredi kartı/paypal ise)
  let paymentDoc = null;
  if (["credit_card", "paypal"].includes(method)) {
    paymentDoc = await Payment.create({
      order: order._id,
      tenant: req.tenant,
      amount: total - discount,
      method,
      status: "pending",
      language: reqLocale,
      isActive: true,
    });
    order.payments = [paymentDoc._id];
    await order.save();
  }

  // 7️⃣ Email & Notification
  const user = userId
    ? await User.findOne({ _id: userId, tenant: req.tenant }).select(
        "email name language"
      )
    : null;
  const locale: SupportedLocale = reqLocale || user?.language || "en";
  const customerEmail = shippingAddressWithTenant?.email || user?.email || "";

  await sendEmail({
    to: customerEmail,
    subject: orderT("email.subject", locale),
    html: orderConfirmationTemplate({
      name: shippingAddressWithTenant.name || user?.name || "",
      itemsList: itemsForMail.join("<br/>"),
      totalPrice: total - discount,
      locale,
    }),
  });

  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: orderT("email.adminSubject", locale),
    html: `<p>${orderT("email.adminBody", locale, {
      orderId: String(order._id),
    })}</p>`,
  });

  const { Notification } = await getTenantModels(req);
  await Notification.create({
    user: userId,
    tenant: req.tenant,
    type: "success",
    message: orderT("notification.orderReceived", locale, {
      total: total - discount,
    }),
    data: { orderId: String(order._id) },
    language: locale,
  });

  logger.info(
    orderT("order.created.success", locale) +
      ` | User: ${userId} | Order: ${order._id}`
  );

  res.status(201).json({
    success: true,
    message: orderT("order.created.success", locale),
    data: {
      ...order.toObject(),
      payment: paymentDoc ? paymentDoc.toObject() : undefined,
      criticalStockWarnings,
      coupon,
      discount,
      finalTotal: total - discount,
    },
  });
});

// 🟠 Sipariş detay (sadece sahibi veya admin görebilir)
export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const { Order } = await getTenantModels(req);
    const order = await Order.findOne({ tenant: req.tenant })
      .populate("items.product")
      .populate("addressId");

    const locale: SupportedLocale = (req.locale as SupportedLocale) || "en";

    if (!order) {
      logger.warn(orderT("error.orderNotFound", locale));
      res.status(404).json({
        success: false,
        message: orderT("error.orderNotFound", locale),
      });
      return;
    }
    if (
      order.user?.toString() !== req.user?._id.toString() &&
      req.user?.role !== "admin"
    ) {
      logger.warn(orderT("error.notAuthorizedViewOrder", locale));
      res.status(403).json({
        success: false,
        message: orderT("error.notAuthorizedViewOrder", locale),
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: orderT("order.fetched.success", locale),
      data: order,
    });
  }
);

// 🟢 Siparişin adresini güncelle (sadece sahibi!)
export const updateShippingAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { Order } = await getTenantModels(req);
    const order = await Order.findOne({ tenant: req.tenant });
    const locale: SupportedLocale = (req.locale as SupportedLocale) || "en";

    if (!order) {
      logger.warn(orderT("error.orderNotFound", locale));
      res.status(404).json({
        success: false,
        message: orderT("error.orderNotFound", locale),
      });
      return;
    }

    if (order.user?.toString() !== req.user?._id.toString()) {
      logger.warn(orderT("error.notAuthorizedUpdateOrder", locale));
      res.status(403).json({
        success: false,
        message: orderT("error.notAuthorizedUpdateOrder", locale),
      });
      return;
    }

    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      logger.warn(orderT("error.shippingAddressRequired", locale));
      res.status(400).json({
        success: false,
        message: orderT("error.shippingAddressRequired", locale),
      });
      return;
    }

    order.shippingAddress = {
      ...order.shippingAddress,
      ...shippingAddress,
    };

    await order.save();

    logger.info(
      orderT("order.addressUpdated.success", locale) +
        ` | User: ${order.user} | Order: ${order._id}`
    );

    res.status(200).json({
      success: true,
      message: orderT("order.addressUpdated.success", locale),
      data: order,
    });
  }
);

export const getMyOrders = asyncHandler(async (req, res) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = (req.locale as SupportedLocale) || "en";

  const orders = await Order.find({ user: req.user?._id, tenant: req.tenant })
    .populate("items.product")
    .populate("addressId")
    .sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    logger.info(orderT("order.noOrdersFound", locale));
    res.status(404).json({
      success: false,
      message: orderT("order.noOrdersFound", locale),
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: orderT("order.fetched.success", locale),
    data: orders,
  });
});
