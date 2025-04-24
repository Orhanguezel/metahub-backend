import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { v4 as uuidv4 } from "uuid";
import Offer from "./offer.model";
import {Product} from "../product";
import {Company} from "../company";
import {Customer} from "../customer";

// ✅ Yeni teklif oluştur
export const createOffer = asyncHandler(async (req: Request, res: Response) => {
  const {
    company,
    customer,
    items,
    taxRate,
    shippingCost,
    validUntil,
    notes,
    paymentTerms,
  } = req.body;

  if (!company || !customer || !items?.length) {
    res.status(400).json({ message: "Eksik bilgiler! Firma, müşteri ve ürünler zorunludur." });
    return;
  }

  const companyExists = await Company.findById(company);
  if (!companyExists) {
    res.status(404).json({ message: "Firma bulunamadı." });
    return;
  }

  const customerExists = await Customer.findById(customer);
  if (!customerExists) {
    res.status(404).json({ message: "Müşteri bulunamadı." });
    return;
  }

  let totalAmount = 0;

  const enrichedItems = await Promise.all(
    items.map(async (item: any) => {
      const product = await Product.findById(item.product);
      if (!product) throw new Error(`Ürün bulunamadı: ${item.product}`);

      totalAmount += item.customPrice * item.quantity;

      return {
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.price,
        customPrice: item.customPrice,
      };
    })
  );

  const taxAmount = (totalAmount * taxRate) / 100;
  const finalAmount = totalAmount + taxAmount + (shippingCost || 0);

  const offer = await Offer.create({
    offerNumber: `OFR-${uuidv4().slice(0, 8)}`,
    user: req.user?._id,
    company,
    customer,
    items: enrichedItems,
    totalAmount: finalAmount,
    taxAmount,
    taxRate,
    shippingCost,
    validUntil,
    notes,
    paymentTerms,
    status: "draft",
    sentByEmail: false,
    pdfLink: "",
  });

  res.status(201).json({
    message: "Teklif başarıyla oluşturuldu.",
    offer,
  });
});

// ✅ Tüm teklifleri getir
export const getOffers = asyncHandler(async (_req: Request, res: Response) => {
  const offers = await Offer.find()
    .populate("user", "name email")
    .populate("company", "companyName email")
    .populate("customer", "companyName contactName email")
    .populate("items.product", "name price");

  res.status(200).json(offers);
});


// ✅ Belirli bir teklifi getir
export const getOfferById = asyncHandler(async (req: Request, res: Response) => {
    const offer = await Offer.findById(req.params.id)
      .populate("user", "name email")
      .populate("company", "companyName email")
      .populate("customer", "companyName contactName email")
      .populate("items.product", "name price");
  
    if (!offer) {
      res.status(404).json({ message: "Teklif bulunamadı." });
      return;
    }
  
    res.status(200).json(offer);
  });
  
  // ✅ Teklifi güncelle
  export const updateOffer = asyncHandler(async (req: Request, res: Response) => {
    const {
      items,
      taxRate,
      shippingCost,
      validUntil,
      notes,
      paymentTerms,
      sentByEmail,
      pdfLink,
    } = req.body;
  
    if (!items?.length) {
      res.status(400).json({ message: "Teklifte en az bir ürün bulunmalıdır." });
      return;
    }
  
    let totalAmount = 0;
  
    const enrichedItems = await Promise.all(
      items.map(async (item: any) => {
        const product = await Product.findById(item.product);
        if (!product) throw new Error(`Ürün bulunamadı: ${item.product}`);
  
        totalAmount += item.customPrice * item.quantity;
  
        return {
          product: product._id,
          quantity: item.quantity,
          unitPrice: product.price,
          customPrice: item.customPrice,
        };
      })
    );
  
    const taxAmount = (totalAmount * taxRate) / 100;
    const finalAmount = totalAmount + taxAmount + (shippingCost || 0);
  
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        items: enrichedItems,
        totalAmount: finalAmount,
        taxAmount,
        taxRate,
        shippingCost,
        validUntil,
        notes,
        paymentTerms,
        sentByEmail,
        pdfLink,
      },
      { new: true }
    );
  
    if (!offer) {
      res.status(404).json({ message: "Teklif güncellenemedi çünkü bulunamadı." });
      return;
    }
  
    res.status(200).json({
      message: "Teklif başarıyla güncellendi.",
      offer,
    });
  });

  // ✅ Teklif durumunu güncelle
export const updateOfferStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
  
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
  
    if (!offer) {
      res.status(404).json({ message: "Teklif bulunamadı." });
      return;
    }
  
    res.status(200).json({
      message: `Teklif durumu '${status}' olarak güncellendi.`,
      offer,
    });
  });
  
  // ✅ Teklifi sil
  export const deleteOffer = asyncHandler(async (req: Request, res: Response) => {
    const offer = await Offer.findByIdAndDelete(req.params.id);
  
    if (!offer) {
      res.status(404).json({ message: "Teklif bulunamadı." });
      return;
    }
  
    res.status(200).json({ message: "Teklif başarıyla silindi." });
  });
  
  
