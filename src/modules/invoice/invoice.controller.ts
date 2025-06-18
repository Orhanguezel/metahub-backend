import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Invoice } from "@/modules/invoice";
//import { Order } from "@/modules/order";
import {
  getCompanyInfo,
  calculateTax,
  generateInvoicePDF,
} from "@/core/utils/invoice.helper";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ➕ Fatura oluştur
export const createInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const { Invoice, Order } = await getTenantModels(req);
    const { order: orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ message: "Order ID is required." });
      return;
    }

    const order = await Order.findOne({
      _id: orderId,
      tenant: req.tenant,
    }).populate("items.product");
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    const company = await getCompanyInfo();
    const { taxAmount, finalAmount } = calculateTax(order.totalPrice);
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    const invoice = await Invoice.create({
      order: order._id,
      tenant: req.tenant,
      user: order.user,
      company: company._id,
      items: order.items.map((p) => {
        const product = p.product as any;
        return {
          product: product._id,
          name: product.name?.en || "Unknown Product",
          quantity: p.quantity,
          unitPrice: product.price,
        };
      }),

      totalAmount: finalAmount,
      taxAmount,
      taxRate: 19,
      invoiceNumber,
      status: order.isPaid ? "paid" : "pending",
    });

    res.status(201).json(invoice);
  }
);

// 👤 Kullanıcının faturaları
export const getUserInvoices = asyncHandler(
  async (req: Request, res: Response) => {
    const { Invoice } = await getTenantModels(req);
    const invoices = await Invoice.find({
      user: req.user._id,
      tenant: req.tenant,
    })
      .populate("order")
      .populate("company")
      .populate("items.product");

    res.status(200).json(invoices);
  }
);

// 🔍 Admin: tüm faturalar
export const getAllInvoices = asyncHandler(
  async (req: Request, res: Response) => {
    const { Invoice } = await getTenantModels(req);
    const invoices = await Invoice.find({ tenant: req.tenant })
      .populate("user", "name email")
      .populate("order")
      .populate("company")
      .populate("items.product");

    res.status(200).json(invoices);
  }
);

// 🔍 Tek fatura (ID ile)
export const getInvoiceById = asyncHandler(
  async (req: Request, res: Response) => {
    const { Invoice } = await getTenantModels(req);
    const invoice = await Invoice.findOne({ tenant: req.tenant })
      .populate("user")
      .populate("order")
      .populate("company")
      .populate("items.product");

    if (!invoice) {
      res.status(404).json({ message: "Invoice not found." });
      return;
    }

    res.status(200).json(invoice);
  }
);

// 📄 Fatura PDF indir
export const getInvoicePDF = asyncHandler(
  async (req: Request, res: Response) => {
    const { Invoice } = await getTenantModels(req);
    const invoice = await Invoice.findOne({ tenant: req.tenant })
      .populate("user")
      .populate("order")
      .populate("company")
      .populate("items.product");

    if (!invoice) {
      res.status(404).json({ message: "Invoice not found." });
      return;
    }

    const filePath = await generateInvoicePDF(invoice);
    res.download(filePath);
  }
);
