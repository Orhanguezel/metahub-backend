import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Types } from "mongoose";
import Order, { IOrderItem, OrderStatus } from "./order.models";
import { Product } from "../product";
import User from "../users/users.models";
import Notification from "../notification/notification.models";
import { sendEmail } from "../../services/emailService";
import { orderConfirmationTemplate } from "../../templates/orderConfirmation";

// ✅ Sipariş oluştur
export const createOrder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    items,
    shippingAddress,
    totalPrice,
  }: { items: IOrderItem[]; shippingAddress: any; totalPrice: number } = req.body;

  if (!items?.length) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Der Warenkorb darf nicht leer sein."
          : req.locale === "tr"
          ? "Sepet boş olamaz."
          : "Cart must not be empty.",
    });
    return;
  }

  const enrichedItems: IOrderItem[] = [];
  const criticalStockWarnings: string[] = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? `Produkt nicht gefunden: ${item.product}`
            : req.locale === "tr"
            ? `Ürün bulunamadı: ${item.product}`
            : `Product not found: ${item.product}`,
      });
      return;
    }

    if (product.stock < item.quantity) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? `Nicht genügend Lagerbestand für ${product.name.de}`
            : req.locale === "tr"
            ? `${product.name.tr} için yeterli stok yok`
            : `Insufficient stock for ${product.name.en}`,
      });
      return;
    }

    product.stock -= item.quantity;
    await product.save();

    if (product.stock <= (product.stockThreshold ?? 5)) {
      criticalStockWarnings.push(`${product.name.tr} → ${product.stock} adet kaldı`);
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

  const itemsList = enrichedItems
    .map((item) => `• Produkt ID: ${item.product} – Menge: ${item.quantity}`)
    .join("<br/>");

  const user = req.user ? await User.findById(req.user._id).select("email") : null;
  const customerEmail = shippingAddress?.email || user?.email || "";

  const htmlToCustomer = orderConfirmationTemplate({
    name: shippingAddress.name,
    itemsList,
    totalPrice,
  });

  const htmlToAdmin = `
    <h2>Neue Bestellung</h2>
    <p><strong>Gesamtpreis:</strong> €${totalPrice.toFixed(2)}</p>
    <p><strong>Produkte:</strong><br/>${itemsList}</p>
    <p><strong>Lieferadresse:</strong><br/>
      ${shippingAddress.name},<br/>
      ${shippingAddress.street},<br/>
      ${shippingAddress.postalCode} ${shippingAddress.city},<br/>
      ${shippingAddress.country}
    </p>
    ${
      criticalStockWarnings.length
        ? `<p style="color:red;"><strong>⚠️ Kritischer Lagerbestand:</strong><br/>${criticalStockWarnings.join("<br/>")}</p>`
        : ""
    }
  `;

  await Promise.all([
    sendEmail({
      to: customerEmail,
      subject: "Bestellbestätigung – Ensotek",
      html: htmlToCustomer,
    }),
    sendEmail({
      to: process.env.SMTP_FROM || "admin@ensotek.de",
      subject: "Neue Bestellung – Ensotek",
      html: htmlToAdmin,
    }),
  ]);

  await Notification.create({
    title:
      req.locale === "de"
        ? "Neue Bestellung erhalten"
        : req.locale === "tr"
        ? "Yeni sipariş alındı"
        : "New order received",
    message:
      req.locale === "de"
        ? `Gesamtpreis: €${totalPrice.toFixed(2)}`
        : req.locale === "tr"
        ? `Toplam tutar: €${totalPrice.toFixed(2)}`
        : `Total price: €${totalPrice.toFixed(2)}`,
    type: "success",
    user: req.user?._id || null,
    language: req.locale || "en",
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Bestellung erfolgreich erstellt."
        : req.locale === "tr"
        ? "Sipariş başarıyla oluşturuldu."
        : "Order created successfully.",
    order,
    criticalStockWarnings,
  });
});

// ✅ Sipariş durumunu güncelle
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { status }: { status: OrderStatus } = req.body;

  const validStatuses: OrderStatus[] = ["pending", "preparing", "shipped", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ message: "Invalid order status." });
    return;
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Bestellung nicht gefunden."
          : req.locale === "tr"
          ? "Sipariş bulunamadı."
          : "Order not found.",
    });
    return;
  }

  order.status = status;
  await order.save();

  res.json({
    success: true,
    message:
      req.locale === "de"
        ? "Bestellstatus aktualisiert."
        : req.locale === "tr"
        ? "Sipariş durumu güncellendi."
        : "Order status updated.",
    order,
  });
});


// ✅ Tüm siparişleri getir (admin)
export const getAllOrders = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { lang } = req.query;
    const filter: any = {};

    if (lang) filter.language = lang;

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  }
);

// ✅ Siparişi teslim olarak işaretle
export const markOrderAsDelivered = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Bestellung nicht gefunden."
            : req.locale === "tr"
            ? "Sipariş bulunamadı."
            : "Order not found.",
      });
      return;
    }

    order.isDelivered = true;
    order.deliveredAt = new Date();
    await order.save();

    res.json({
      message:
        req.locale === "de"
          ? "Bestellung als geliefert markiert."
          : req.locale === "tr"
          ? "Sipariş teslim edildi olarak işaretlendi."
          : "Order marked as delivered.",
    });
  }
);