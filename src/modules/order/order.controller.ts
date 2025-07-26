import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/modules/order/templates/orderConfirmation";
import type { SupportedLocale } from "@/types/common";
import { t } from "@/core/utils/i18n/translate";
import orderTranslations from "@/modules/order/i18n";
import logger from "@/core/middleware/logger/logger";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// Kısa yol çeviri fonksiyonu
function orderT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, orderTranslations, vars);
}

// --- SİPARİŞ OLUŞTUR ---
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const {
    Order,
    Address,
    Coupon,
    Payment,
    User,
    Notification,
    Bike,
    Ensotekprod,
    Sparepart,
  } = await getTenantModels(req);
  const { items, addressId, shippingAddress, paymentMethod, couponCode } =
    req.body;
  const userId = req.user?._id;
  const userName = req.user?.name || "";

  const locale: SupportedLocale = req.locale || getLogLocale();

  // --- Tenant marka ve email ayarları
  const tenantData = req.tenantData;
  const brandName =
    (tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name) ??
    "Brand";
  const senderEmail =
    tenantData?.emailSettings?.senderEmail || "noreply@example.com";
  const adminEmail =
    tenantData?.emailSettings?.adminEmail ||
    tenantData?.emailSettings?.senderEmail ||
    "noreply@example.com";

  // --- Adres işlemleri
  let shippingAddressWithTenant: any;
  if (addressId) {
    const addressDoc = await Address.findOne({
      _id: addressId,
      tenant: req.tenant,
    }).lean();
    if (!addressDoc) {
      logger.withReq.warn(req, orderT("error.addressNotFound", locale));
      res
        .status(400)
        .json({
          success: false,
          message: orderT("error.addressNotFound", locale),
        });
      return;
    }
    shippingAddressWithTenant = {
      name: userName,
      tenant: req.tenant,
      phone: addressDoc.phone,
      street: addressDoc.street,
      city: addressDoc.city,
      postalCode: addressDoc.zipCode,
      country: addressDoc.country || "Germany",
      ...(shippingAddress || {}),
    };
  } else {
    shippingAddressWithTenant = { ...shippingAddress, tenant: req.tenant };
  }

  // --- Adres zorunlu alanlar
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
    logger.withReq.warn(req, orderT("error.shippingAddressRequired", locale));
    res.status(400).json({
      success: false,
      message: orderT("error.shippingAddressRequired", locale),
      redirect: "/account",
    });
    return;
  }

  // --- Ürün kontrol, stok ve toplam (Bike, Ensotekprod veya yeni model)
  let total = 0;
  const enrichedItems: any[] = [];
  const criticalStockWarnings: string[] = [];
  const itemsForMail: string[] = [];

  for (const item of items) {
    // **productModel zorunlu**
    const modelName = item.productModel;
    if (
      !modelName ||
      !["bike", "ensotekprod", "sparepart"].includes(modelName)
    ) {
      res
        .status(400)
        .json({ success: false, message: "Invalid or missing product model!" });
      return;
    }
    // Dinamik olarak model seç
    const ProductModel = { Bike, Ensotekprod, Sparepart }[modelName];
    if (!ProductModel) {
      res
        .status(400)
        .json({ success: false, message: `Model not supported: ${modelName}` });
      return;
    }
    const product = await ProductModel.findOne({
      _id: item.product,
      tenant: req.tenant,
    });
    if (!product) {
      logger.withReq.warn(req, orderT("error.productNotFound", locale));
      res
        .status(404)
        .json({
          success: false,
          message: orderT("error.productNotFound", locale),
        });
      return;
    }
    if (product.stock < item.quantity) {
      logger.withReq.warn(req, orderT("error.insufficientStock", locale));
      res
        .status(400)
        .json({
          success: false,
          message: orderT("error.insufficientStock", locale),
        });
      return;
    }
    product.stock -= item.quantity;
    await product.save();

    if (product.stock <= (product.stockThreshold ?? 5)) {
      criticalStockWarnings.push(
        orderT("warning.lowStock", locale, {
          name:
            product.name?.[locale] || product.name?.en || String(product._id),
          stock: String(product.stock),
        })
      );
    }
    enrichedItems.push({
      product: product._id,
      productModel: modelName, // refPath için şart
      quantity: item.quantity,
      unitPrice: product.price,
      tenant: req.tenant,
    });
    itemsForMail.push(
      `• ${
        product.name?.[locale] || product.name?.en || String(product._id)
      } – Qty: ${item.quantity}`
    );
    total += product.price * item.quantity;
  }

  // --- Kupon
  let discount = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true,
      tenant: req.tenant,
      expiresAt: { $gte: new Date() },
    });
    if (coupon) {
      discount = Math.round(total * (coupon.discount / 100));
    } else {
      logger.withReq.warn(req, orderT("error.invalidCoupon", locale));
      res
        .status(400)
        .json({
          success: false,
          message: orderT("error.invalidCoupon", locale),
        });
      return;
    }
  }

  // --- Payment method kontrol
  const method = (paymentMethod as string) || "cash_on_delivery";
  if (!["cash_on_delivery", "credit_card", "paypal"].includes(method)) {
    logger.withReq.warn(req, orderT("error.invalidPaymentMethod", locale));
    res
      .status(400)
      .json({
        success: false,
        message: orderT("error.invalidPaymentMethod", locale),
      });
    return;
  }

  // --- Siparişi oluştur
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
    language: locale,
  });

  // --- Payment (kredi kartı/paypal ise)
  let paymentDoc = null;
  if (["credit_card", "paypal"].includes(method)) {
    paymentDoc = await Payment.create({
      order: order._id,
      tenant: req.tenant,
      amount: total - discount,
      method,
      status: "pending",
      language: locale,
      isActive: true,
    });
    order.payments = [paymentDoc._id];
    await order.save();
  }

  // --- Email & Notification
  const user = userId
    ? await User.findOne({ _id: userId, tenant: req.tenant }).select(
        "email name language"
      )
    : null;
  const customerEmail = shippingAddressWithTenant?.email || user?.email || "";

  await sendEmail({
    tenantSlug: req.tenant,
    to: customerEmail,
    subject: orderT("email.subject", locale, { brand: brandName }),
    html: orderConfirmationTemplate({
      name: shippingAddressWithTenant.name || user?.name || "",
      itemsList: itemsForMail.join("<br/>"),
      totalPrice: total - discount,
      locale: typeof locale === "string" ? locale : locale[0] || "en",
      brandName,
      senderEmail,
      orderId: String(order._id),
      paymentMethod: orderT(`payment.method.${method}`, locale),
      paymentStatus: orderT(`payment.status.pending`, locale),
      criticalStockWarnings: criticalStockWarnings.join("<br/>"),
      couponCode: coupon ? `${coupon.code} (${coupon.discount}%)` : null,
      discount,
      finalTotal: total - discount,
    }) as string,
    from: senderEmail,
  });

  await sendEmail({
    tenantSlug: req.tenant,
    to: adminEmail,
    subject: orderT("email.adminSubject", locale, { brand: brandName }),
    html: `<p>${orderT("email.adminBody", locale, {
      orderId: String(order._id),
    })}</p>`,
    from: senderEmail,
  });

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

  logger.withReq.info(
    req,
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

// --- Sipariş Detay (owner veya admin) ---
export const getOrderById = asyncHandler(
  async (req: Request, res: Response) => {
    const { Order } = await getTenantModels(req);
    const locale: SupportedLocale = req.locale || getLogLocale();

    const order = await Order.findOne({
      _id: req.params.id,
      tenant: req.tenant,
    })
      .populate("items.product")
      .populate("addressId");

    if (!order) {
      logger.withReq.warn(req, orderT("error.orderNotFound", locale));
      res
        .status(404)
        .json({
          success: false,
          message: orderT("error.orderNotFound", locale),
        });
      return;
    }
    if (
      order.user?.toString() !== req.user?._id.toString() &&
      req.user?.role !== "admin"
    ) {
      logger.withReq.warn(req, orderT("error.notAuthorizedViewOrder", locale));
      res
        .status(403)
        .json({
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

// --- Siparişin adresini güncelle (owner) ---
export const updateShippingAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { Order } = await getTenantModels(req);
    const locale: SupportedLocale = req.locale || getLogLocale();

    const order = await Order.findOne({
      _id: req.params.id,
      tenant: req.tenant,
    });
    if (!order) {
      logger.withReq.warn(req, orderT("error.orderNotFound", locale));
      res
        .status(404)
        .json({
          success: false,
          message: orderT("error.orderNotFound", locale),
        });
      return;
    }
    if (order.user?.toString() !== req.user?._id.toString()) {
      logger.withReq.warn(
        req,
        orderT("error.notAuthorizedUpdateOrder", locale)
      );
      res
        .status(403)
        .json({
          success: false,
          message: orderT("error.notAuthorizedUpdateOrder", locale),
        });
      return;
    }
    const { shippingAddress } = req.body;
    if (!shippingAddress) {
      logger.withReq.warn(req, orderT("error.shippingAddressRequired", locale));
      res
        .status(400)
        .json({
          success: false,
          message: orderT("error.shippingAddressRequired", locale),
        });
      return;
    }
    order.shippingAddress = { ...order.shippingAddress, ...shippingAddress };
    await order.save();
    logger.withReq.info(
      req,
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

// --- Kullanıcının kendi siparişleri ---
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const { Order } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();

  const orders = await Order.find({ user: req.user?._id, tenant: req.tenant })
    .populate("items.product")
    .populate("addressId")
    .sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    logger.withReq.info(req, orderT("order.noOrdersFound", locale));
    res
      .status(404)
      .json({ success: false, message: orderT("order.noOrdersFound", locale) });
    return;
  }

  res.status(200).json({
    success: true,
    message: orderT("order.fetched.success", locale),
    data: orders,
  });
});
