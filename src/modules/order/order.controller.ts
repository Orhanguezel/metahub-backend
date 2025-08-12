import { Request, Response } from "express";
import type { Model } from "mongoose";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/modules/order/templates/orderConfirmation";
import type { SupportedLocale } from "@/types/common";
import { t } from "@/core/utils/i18n/translate";
import orderTranslations from "@/modules/order/i18n";
import logger from "@/core/middleware/logger/logger";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { IOrderItem, IShippingAddress } from "@/modules/order/types/index";
import type { PaymentMethod } from "@/modules/order/types/index";
import { SUPPORTED_LOCALES } from "@/types/common";

function orderT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, orderTranslations, vars);
}
function notificationT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, string | number>
) {
  return t(key, locale, vars);
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

  type ProductType = "bike" | "ensotekprod" | "sparepart";

  const { items, addressId, shippingAddress, paymentMethod, couponCode } = req.body;
  const userId = req.user?._id;
  const userName = req.user?.name || "";
  const userEmail = req.user?.email || "";
  const locale: SupportedLocale = req.locale || getLogLocale();

  // Tenant bilgileri
  const tenantData = req.tenantData;
  const brandName =
    tenantData?.name?.[locale] || tenantData?.name?.[ "en" ] || tenantData?.name || "Brand";
  const brandWebsite =
    (tenantData?.domain?.main && `https://${tenantData.domain.main}`) || process.env.BRAND_WEBSITE;
  const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";
  const adminEmail  = tenantData?.emailSettings?.adminEmail  || senderEmail;

  // --- Adres kontrolü (değişmedi) ---
  let shippingAddressWithTenant: IShippingAddress;
  if (addressId) {
    const addressDoc = await Address.findOne({ _id: addressId, tenant: req.tenant }).lean();
    if (!addressDoc) {
      res.status(400).json({ success: false, message: orderT("error.addressNotFound", locale) });
      return;
    }
    shippingAddressWithTenant = {
      name: userName,
      tenant: req.tenant,
      phone: addressDoc.phone,
      street: addressDoc.street,
      houseNumber: addressDoc.houseNumber,
      city: addressDoc.city,
      postalCode: addressDoc.postalCode || "",
      country: addressDoc.country || "Germany",
      addressType: addressDoc.addressType || "shipping",
      email: userEmail,
      ...(shippingAddress || {}),
    };
  } else {
    shippingAddressWithTenant = { ...shippingAddress, tenant: req.tenant, email: userEmail };
  }

  // --- Zorunlu alanlar (değişmedi) ---
  const requiredFields = ["name", "phone", "street", "city", "postalCode", "country"];
  for (const field of requiredFields) {
    if (!shippingAddressWithTenant[field]) {
      logger.withReq.warn(req, orderT("error.shippingAddressRequired", locale));
      res.status(400).json({
        success: false,
        message: orderT("error.shippingAddressRequired", locale),
        redirect: "/account",
      });
      return;
    }
  }
  if (!userEmail) {
    res.status(400).json({
      success: false,
      message: orderT("error.userEmailRequired", locale),
      redirect: "/account",
    });
    return;
  }

  // --- Ürünler & stok (v2 notification entegrasyonu bu blokta) ---
  const modelMap: Record<ProductType, Model<any>> = {
  bike: Bike as unknown as Model<any>,
  ensotekprod: Ensotekprod as unknown as Model<any>,
  sparepart: Sparepart as unknown as Model<any>,
};

  let total = 0;
  const enrichedItems: IOrderItem[] = [];
  const criticalStockWarnings: string[] = [];
  const itemsForMail: string[] = [];


  for (const item of items) {
    const modelName = item.productType?.toLowerCase?.();
    const ProductModel = modelMap[modelName as keyof typeof modelMap];
    if (!ProductModel) {
      res.status(400).json({ success: false, message: `Model not supported: ${item.productType}` });
      return;
    }

    const product = await ProductModel.findOne({ _id: item.product, tenant: req.tenant });
    if (!product) {
      res.status(404).json({ success: false, message: orderT("error.productNotFound", locale) });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ success: false, message: orderT("error.insufficientStock", locale) });
      return;
    }

    product.stock -= item.quantity;
    await product.save();

    // --- Kritik Stok Bildirimi (Notification v2, roles + dedupe + source + link + tags) ---
    const threshold = product.stockThreshold ?? 5;
    if (typeof product.stock === "number" && product.stock <= threshold) {
      // Çok dilli title/message
      const nameObj = product.name || {};
      const title: Record<SupportedLocale, string> = {} as any;
      const message: Record<SupportedLocale, string> = {} as any;
      for (const lng of SUPPORTED_LOCALES) {
        title[lng] = orderT("criticalStock.title", lng);
        message[lng] = orderT("criticalStock.message", lng, {
          name: nameObj[lng] || nameObj["en"] || String(product._id),
          stock: product.stock,
          productType: modelName,
        });
      }

      // 30 dk dedupe; stok değeri anahtara dahil (stok daha da düşerse yeni bildirim çıkar)
      const dedupeWindowMin = 30;
      const dedupeKey = `${req.tenant}:stocklow:${modelName}:${product._id}:${product.stock}`;
      const since = new Date(Date.now() - dedupeWindowMin * 60_000);
      const dup = await Notification.findOne({
        tenant: req.tenant,
        dedupeKey,
        createdAt: { $gte: since },
      });

      if (!dup) {
        await Notification.create({
          tenant: req.tenant,
          type: "warning",
          title,
          message,
          channels: ["inapp"],
          target: { roles: ["admin", "moderator"] }, // yöneticilere düşsün
          data: {
            productId: product._id,
            stock: product.stock,
            productType: modelName,
          },
          source: {
            module: "inventory",
            entity: modelName,     // "bike" | "ensotekprod" | "sparepart"
            refId: product._id,
            event: "stock.low",
          },
          tags: ["inventory", "stock", "low"],
          link: {
            routeName: "admin.products.detail",
            params: { type: modelName, id: String(product._id) },
          },
          dedupeKey,
          dedupeWindowMin,
        });
      }
    }

    // enrich
    enrichedItems.push({
      product: product._id,
      productType: modelName,
      quantity: item.quantity,
      unitPrice: product.price,
      tenant: req.tenant,
    });
    itemsForMail.push(`• ${product.name?.[locale] || product.name?.en} – Qty: ${item.quantity}`);
    total += product.price * item.quantity;

    if (product.stock <= (product.stockThreshold ?? 5)) {
      criticalStockWarnings.push(
        orderT("warning.lowStock", locale, {
          name: product.name?.[locale] || product.name?.en || String(product._id),
          stock: String(product.stock),
        })
      );
    }
  }

  // --- Kupon (değişmedi) ---
  let discount = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true,
      tenant: req.tenant,
      expiresAt: { $gte: new Date() },
    });
    if (!coupon) {
      res.status(400).json({ success: false, message: orderT("error.invalidCoupon", locale) });
      return;
    }
    discount = Math.round(total * (coupon.discount / 100));
  }

  // --- Ödeme yöntemi (değişmedi) ---
  const method: PaymentMethod = paymentMethod || "cash_on_delivery";
  if (!["cash_on_delivery", "credit_card", "paypal"].includes(method)) {
    res.status(400).json({ success: false, message: orderT("error.invalidPaymentMethod", locale) });
    return;
  }

  // --- Order kaydı (değişmedi) ---
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
    isDelivered: false,
    isPaid: false,
    language: locale,
  });

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

  // --- Email: Customer (değişmedi) ---
  const customerEmail = userEmail;
  await sendEmail({
    tenantSlug: req.tenant,
    to: customerEmail,
    subject: orderT("email.subject", locale, { brand: brandName }),
    html: orderConfirmationTemplate({
      name: shippingAddressWithTenant.name || req.user?.name || "",
      itemsList: itemsForMail.join("<br/>"),
      totalPrice: total - discount,
      locale,
      brandName,
      brandWebsite,
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

  // --- Email: Admin (değişmedi) ---
  await sendEmail({
    tenantSlug: req.tenant,
    to: adminEmail,
    subject: orderT("email.adminSubject", locale, { brand: brandName }),
    html: `
      <h2>🛒 ${orderT("email.adminOrderTitle", locale, { brand: brandName })}</h2>
      <ul>
        <li><strong>${orderT("labelOrderId", locale)}:</strong> ${order._id}</li>
        <li><strong>${orderT("labelCustomerName", locale)}:</strong> ${shippingAddressWithTenant.name || req.user?.name || ""}</li>
        <li><strong>Email:</strong> ${customerEmail}</li>
        <li><strong>${orderT("labelItems", locale)}:</strong> ${itemsForMail.join("<br/>")}</li>
        <li><strong>${orderT("labelTotal", locale)}:</strong> €${(total - discount).toFixed(2)}</li>
        <li><strong>${orderT("labelPaymentMethod", locale)}:</strong> ${orderT(`payment.method.${method}`, locale)}</li>
      </ul>
    `,
    from: senderEmail,
  });

  // --- Sipariş başarı bildirimi (Notification v2, user feed + dedupe + source/tags) ---
  const notifyTitle: Record<SupportedLocale, string> = {} as any;
  const notifyMsg:   Record<SupportedLocale, string> = {} as any;
  for (const lng of SUPPORTED_LOCALES) {
    notifyTitle[lng] = orderT("notification.orderReceivedTitle", lng);
    notifyMsg[lng]   = orderT("notification.orderReceived", lng, { total: total - discount });
  }

  // 5 dk dedupe — aynı kullanıcıya aynı sipariş bildirimi üst üste gelmesin
  const userKey = String(userId || "guest");
  const orderDedupeKey = `${req.tenant}:order:created:${order._id}:${userKey}`;
  const orderDedupeWindowMin = 5;
  const orderSince = new Date(Date.now() - orderDedupeWindowMin * 60_000);
  const orderDup = await Notification.findOne({
    tenant: req.tenant,
    dedupeKey: orderDedupeKey,
    createdAt: { $gte: orderSince },
  });

  if (!orderDup) {
    await Notification.create({
      tenant: req.tenant,
      user: userId || undefined,     // kullanıcının feed'ine düşsün
      type: "success",
      title: notifyTitle,
      message: notifyMsg,
      channels: ["inapp"],
      data: { orderId: String(order._id), total: total - discount },
      source: { module: "order", entity: "order", refId: order._id, event: "order.created" },
      tags: ["order", "customer"],
      dedupeKey: orderDedupeKey,
      dedupeWindowMin: orderDedupeWindowMin,
      link: {
        routeName: "account.orders.detail",
        params: { id: String(order._id) },
      },
    });
  }

  logger.withReq.info(
    req,
    orderT("order.created.success", locale) + ` | User: ${userId} | Order: ${order._id}`
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
      logger.withReq.warn(req, orderT("error.notAuthorizedViewOrder", locale));
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
      res.status(404).json({
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
      res.status(403).json({
        success: false,
        message: orderT("error.notAuthorizedUpdateOrder", locale),
      });
      return;
    }
    const { shippingAddress } = req.body;
    if (!shippingAddress) {
      logger.withReq.warn(req, orderT("error.shippingAddressRequired", locale));
      res.status(400).json({
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
