import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Order } from "@/modules/order";
import { RadonarProd } from "@/modules/radonarprod";
import { Address } from "@/modules/address";
import { Coupon } from "@/modules/coupon";
import { Payment } from "@/modules/payment";
import { User } from "@/modules/users";
import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/templates/orderConfirmation";
import { Notification } from "@/modules/notification";

// Multi-language notification mesajı
function getOrderNotificationMessage(totalPrice: number, locale: "en" | "de" | "tr" = "en") {
  const messages = {
    tr: `Yeni siparişiniz alındı. Toplam: ${totalPrice}₺`,
    en: `Your order has been received. Total: €${totalPrice}`,
    de: `Ihre Bestellung ist eingegangen. Gesamt: €${totalPrice}`,
  };
  return messages[locale] || messages.en;
}

// 🟢 Sipariş Oluştur
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { items, addressId, shippingAddress, totalPrice, paymentMethod, couponCode } = req.body;

  // 1️⃣ Shipping Address
  let finalShippingAddress = shippingAddress;
  if (addressId) {
    const addressDoc = await Address.findById(addressId).lean();
    if (!addressDoc) {
      res.status(400).json({ success: false, message: "Address not found." });
      return 
    }
    finalShippingAddress = {
      name: req.user?.name || "",
      phone: addressDoc.phone,
      email: addressDoc.email,
      street: addressDoc.street,
      city: addressDoc.city,
      postalCode: addressDoc.zipCode,
      country: addressDoc.country || "Germany",
      ...(shippingAddress || {}),
    };
  }
  // Guard: Eksik adres
  if (
    !finalShippingAddress ||
    !finalShippingAddress.name ||
    !finalShippingAddress.phone ||
    !finalShippingAddress.email ||
    !finalShippingAddress.street ||
    !finalShippingAddress.city ||
    !finalShippingAddress.postalCode ||
    !finalShippingAddress.country
  ) {
    res.status(400).json({
      success: false,
      message: "Shipping address is required. Please update your address.",
      redirect: "/account",
    });return;
  }

  // 2️⃣ Ürünleri doğrula, fiyatları netleştir
  let total = 0;
  const enrichedItems = [];
  const criticalStockWarnings: string[] = [];
  const itemsForMail: string[] = [];

  for (const item of items) {
    const product = await RadonarProd.findById(item.product);
    if (!product) {
      res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ success: false, message: `Insufficient stock for ${product.name.en}` });
      return;
    }
    product.stock -= item.quantity;
    await product.save();

    if (product.stock <= (product.stockThreshold ?? 5)) {
      criticalStockWarnings.push(`${product.name.tr} → ${product.stock} left`);
    }
    enrichedItems.push({
      product: product._id,
      quantity: item.quantity,
      unitPrice: product.price,
    });
    itemsForMail.push(
      `• ${product.name?.en || product.name?.tr || product.name?.de || product._id} – Qty: ${item.quantity}`
    );
    total += product.price * item.quantity;
  }

  // 3️⃣ Kuponu uygula (opsiyonel)
  let discount = 0;
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      isActive: true,
      expiresAt: { $gte: new Date() }
    });
    if (coupon) {
      discount = Math.round(total * (coupon.discount / 100));
    } else {
      // Yanlış/expired kupon — Hata dön, sipariş oluşmasın
      res.status(400).json({ success: false, message: "Invalid or expired coupon code." });
      return;
    }
  }

  // 4️⃣ Ödeme methodunu kontrol et
  const method: "cash_on_delivery" | "credit_card" | "paypal" = paymentMethod || "cash_on_delivery";
  if (!["cash_on_delivery", "credit_card", "paypal"].includes(method)) {
    res.status(400).json({ success: false, message: "Invalid payment method." });
    return;
  }

  // 5️⃣ Sipariş Oluştur
  const order = await Order.create({
    user: req.user?._id,
    addressId: addressId || undefined,
    items: enrichedItems,
    shippingAddress: finalShippingAddress,
    totalPrice: total,
    discount,
    coupon: coupon?._id,
    paymentMethod: method,
    status: "pending",
    language: req.locale || "en",
  });

  // 6️⃣ Payment (sadece kredi kartı/paypal ise hemen payment kaydı aç, stripe/paypal entegrasyonu ile güncellenir)
  let paymentDoc = null;
  if (["credit_card", "paypal"].includes(method)) {
    paymentDoc = await Payment.create({
      order: order._id,
      amount: total - discount,
      method,
      status: "pending",
      language: req.locale || "en",
      isActive: true,
    });
    // Order'a payment referansı ekle (çoklu ödeme desteği için payments dizisine push)
    order.payments = [paymentDoc._id];
    await order.save();
  }

  // 7️⃣ Email & Notification
  const user = req.user ? await User.findById(req.user._id).select("email name language") : null;
  const locale = req.locale || user?.language || "en";
  const customerEmail = finalShippingAddress?.email || user?.email || "";
  const subjectMap = { de: "Bestellbestätigung", tr: "Sipariş Onayı", en: "Order Confirmation" };

  await sendEmail({
    to: customerEmail,
    subject: subjectMap[locale as "de" | "tr" | "en"] || subjectMap.en,
    html: orderConfirmationTemplate({
      name: finalShippingAddress.name || user?.name || "",
      itemsList: itemsForMail.join("<br/>"),
      totalPrice: total - discount,
      locale,
    }),
  });

  const adminSubjectMap = { de: "Neue Bestellung erhalten", tr: "Yeni Sipariş Alındı", en: "New Order Received" };
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: adminSubjectMap[locale as "de" | "tr" | "en"] || adminSubjectMap.en,
    html: `<p>New order received. Order ID: ${order._id}</p>`,
  });

  await Notification.create({
    user: req.user?._id,
    type: "success",
    message: getOrderNotificationMessage(total - discount, locale as "en" | "de" | "tr"),
    data: { orderId: order._id },
    language: locale,
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    data: {
      ...order.toObject(),
      payment: paymentDoc ? paymentDoc.toObject() : undefined,
      criticalStockWarnings,
      coupon,
      discount,
      finalTotal: total - discount,
    },
  });
  return;
});


// 🟢 Siparişi getir
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product")
    .populate("addressId");

  if (!order) {
     res.status(404).json({ success: false, message: "Order not found." });
     return
  }
  // Sadece siparişi oluşturan kullanıcı veya admin görebilir
  if (
    order.user?.toString() !== req.user?._id.toString() &&
    req.user?.role !== "admin"
  ) {
     res.status(403).json({ success: false, message: "You are not authorized to view this order." });
     return;
  }

   res.status(200).json({
    success: true,
    message: "Order fetched successfully.",
    data: order,
  });
  return;
});

// 🟢 Siparişin adresini güncelle (sadece siparişi oluşturan user!)
export const updateShippingAddress = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404).json({ success: false, message: "Order not found." });
    return;
  }

  if (order.user?.toString() !== req.user?._id.toString()) {
     res.status(403).json({ success: false, message: "You are not authorized to update this order." });
     return;
  }

  const { shippingAddress } = req.body;

  if (!shippingAddress) {
    res.status(400).json({ success: false, message: "Shipping address is required." });
    return;
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
  return;
});
