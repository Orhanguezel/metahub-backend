// src/controllers/customer.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Customer from "./customer.models";

// ✅ Tüm müşterileri getir
export const getAllCustomers = asyncHandler(async (_req: Request, res: Response) => {
  const customers = await Customer.find().sort({ createdAt: -1 });
  res.status(200).json(customers);
});

// ✅ Belirli müşteri
export const getCustomerById = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kunde nicht gefunden."
          : req.locale === "tr"
          ? "Müşteri bulunamadı."
          : "Customer not found.",
    });
    return;
  }
  res.status(200).json(customer);
});

// ✅ Yeni müşteri
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { companyName, contactName, email, phone, address } = req.body;

  if (!companyName || !contactName || !email || !phone || !address) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Alle Felder sind erforderlich."
          : req.locale === "tr"
          ? "Tüm alanlar zorunludur."
          : "All fields are required.",
    });
    return;
  }

  const customer = await Customer.create({ companyName, contactName, email, phone, address });
  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kunde erfolgreich hinzugefügt."
        : req.locale === "tr"
        ? "Müşteri başarıyla eklendi."
        : "Customer created successfully.",
    customer,
  });
});

// ✅ Müşteri güncelle
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });

  if (!customer) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kunde nicht gefunden."
          : req.locale === "tr"
          ? "Müşteri bulunamadı."
          : "Customer not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kunde aktualisiert."
        : req.locale === "tr"
        ? "Müşteri güncellendi."
        : "Customer updated.",
    customer,
  });
});

// ✅ Sil
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);

  if (!customer) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kunde nicht gefunden."
          : req.locale === "tr"
          ? "Müşteri bulunamadı."
          : "Customer not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kunde gelöscht."
        : req.locale === "tr"
        ? "Müşteri silindi."
        : "Customer deleted.",
    id: req.params.id,
  });
});
