import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Invoice } from "@/modules/invoice";
import { Order } from "@/modules/order";
import { getCompanyInfo, calculateTax, generateInvoicePDF } from "../../core/utils/invoice.helper";

// ➕ Fatura oluştur
export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
    const { order: orderId } = req.body;


  
    if (!orderId) {
      res.status(400).json({ message: "Order ID is required." });
      return;
    }
  
    const order = await Order.findById(orderId).populate("items.product");
    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }
  
    const company = await getCompanyInfo();
    const { taxAmount, finalAmount } = calculateTax(order.totalPrice);
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
    const invoice = await Invoice.create({
      order: order._id,
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
  });
  

// 👤 Kullanıcının faturaları
export const getUserInvoices = asyncHandler(async (req: Request, res: Response) => {
  const invoices = await Invoice.find({ user: req.user._id })
    .populate("order")
    .populate("company")
    .populate("items.product");

  res.status(200).json(invoices);
});

// 🔍 Admin: tüm faturalar
export const getAllInvoices = asyncHandler(async (_req: Request, res: Response) => {
  const invoices = await Invoice.find()
    .populate("user", "name email")
    .populate("order")
    .populate("company")
    .populate("items.product");

  res.status(200).json(invoices);
});

// 🔍 Tek fatura (ID ile)
export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate("user")
    .populate("order")
    .populate("company")
    .populate("items.product");

  if (!invoice) {
    res.status(404).json({ message: "Invoice not found." });
    return;
  }

  res.status(200).json(invoice);
});

// 📄 Fatura PDF indir
export const getInvoicePDF = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await Invoice.findById(req.params.id)
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
});
