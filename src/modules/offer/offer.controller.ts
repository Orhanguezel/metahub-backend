import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { v4 as uuidv4 } from "uuid";
//import { Offer } from "@/modules/offer";
//import { Product } from "@/modules/product";
//import { Company } from "@/modules/company";
//import { Customer } from "@/modules/customer";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Yeni teklif oluştur
export const createOffer = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { Offer, Product, Company, Customer } = await getTenantModels(req);
    try {
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
        res
          .status(400)
          .json({ message: "Company, customer, and items are required." });
        return;
      }

      const companyExists = await Company.findOne({
        _id: company,
        tenant: req.tenant,
      });
      if (!companyExists) {
        res.status(404).json({ message: "Company not found." });
        return;
      }

      const customerExists = await Customer.findOne({
        _id: customer,
        tenant: req.tenant,
      });
      if (!customerExists) {
        res.status(404).json({ message: "Customer not found." });
        return;
      }

      let totalAmount = 0;

      const enrichedItems = await Promise.all(
        items.map(async (item: any) => {
          const product = await Product.findOne({
            _id: item.product,
            tenant: req.tenant,
          });
          if (!product) throw new Error(`Product not found: ${item.product}`);

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
        tenant: req.tenant,
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
        success: true,
        message: "Offer created successfully.",
        offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Tüm teklifleri getir
export const getOffers = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { Offer } = await getTenantModels(req);
      const offers = await Offer.find({ tenant: req.tenant })
        .populate("user", "name email")
        .populate("company", "companyName email")
        .populate("customer", "companyName contactName email")
        .populate("items.product", "name price");

      res.status(200).json({
        success: true,
        data: offers,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Belirli bir teklifi getir
export const getOfferById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { Offer } = await getTenantModels(req);
      const offer = await Offer.findOne({ tenant: req.tenant })
        .populate("user", "name email")
        .populate("company", "companyName email")
        .populate("customer", "companyName contactName email")
        .populate("items.product", "name price");

      if (!offer) {
        res.status(404).json({ success: false, message: "Offer not found." });
        return;
      }

      res.status(200).json({
        success: true,
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Teklifi güncelle
export const updateOffer = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { Offer, Product } = await getTenantModels(req);
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
        res
          .status(400)
          .json({ message: "At least one product is required in the offer." });
        return;
      }

      let totalAmount = 0;

      const enrichedItems = await Promise.all(
        items.map(async (item: any) => {
          const product = await Product.findOne({
            _id: item.product,
            tenant: req.tenant,
          });
          if (!product) throw new Error(`Product not found: ${item.product}`);

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
        res
          .status(404)
          .json({ success: false, message: "Offer not found for update." });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Offer updated successfully.",
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Teklif durumunu güncelle
export const updateOfferStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { Offer } = await getTenantModels(req);
      const { status } = req.body;

      const offer = await Offer.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!offer) {
        res.status(404).json({ success: false, message: "Offer not found." });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Offer status updated to '${status}'.`,
        data: offer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Teklifi sil
export const deleteOffer = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { Offer } = await getTenantModels(req);
      const offer = await Offer.findByIdAndDelete(req.params.id);

      if (!offer) {
        res.status(404).json({ success: false, message: "Offer not found." });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Offer deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);
