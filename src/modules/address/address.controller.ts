import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import Address from "./address.models";

// ✅ Kullanıcının adreslerini getir
export const getUserAddresses = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId || !isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Addresses fetched successfully.",
      data: addresses,
    });
    
    return;
  } catch (error) {
    next(error);
  }
});



// ✅ Yeni adres oluştur
export const createAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { street, houseNumber, city, zipCode, country, label, isDefault } = req.body;

    if (!userId || !isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    if (!street || !houseNumber || !city || !zipCode || !label?.tr || !label?.en || !label?.de) {
      res.status(400).json({ message: "Please fill all required fields." });
      return;
    }

    const newAddress = await Address.create({
      userId,
      street,
      houseNumber,
      city,
      zipCode,
      country: country || "Germany",
      isDefault: isDefault ?? false,
      label,
    });

    res.status(201).json({
      success: true,
      message: "Address created successfully.",
      data: newAddress,
    });

    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Belirli adresi getir (ID ile)
export const getAddressById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
  
      if (!isValidObjectId(id)) {
        res.status(400).json({ message: "Invalid address ID." });
        return;
      }
  
      const address = await Address.findById(id);
  
      if (!address) {
        res.status(404).json({ message: "Address not found." });
        return;
      }
  
      res.status(200).json({
        success: true,
        data: address,
      });
  
      return;
    } catch (error) {
      next(error);
    }
  });


  // ✅ Adresi güncelle
export const updateAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { street, houseNumber, city, zipCode, country, isDefault, label } = req.body;
  
      if (!isValidObjectId(id)) {
        res.status(400).json({ message: "Invalid address ID." });
        return;
      }
  
      const address = await Address.findById(id);
  
      if (!address) {
        res.status(404).json({ message: "Address not found." });
        return;
      }
  
      address.street = street ?? address.street;
      address.houseNumber = houseNumber ?? address.houseNumber;
      address.city = city ?? address.city;
      address.zipCode = zipCode ?? address.zipCode;
      address.country = country ?? address.country;
      address.isDefault = typeof isDefault === "boolean" ? isDefault : address.isDefault;
      address.label = label ?? address.label;
  
      await address.save();
  
      res.status(200).json({
        success: true,
        message: "Address updated successfully.",
        data: address,
      });
  
      return;
    } catch (error) {
      next(error);
    }
  });

  // ✅ Adresi sil
export const deleteAddress = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
  
      if (!isValidObjectId(id)) {
        res.status(400).json({ message: "Invalid address ID." });
        return;
      }
  
      const address = await Address.findByIdAndDelete(id);
  
      if (!address) {
        res.status(404).json({ message: "Address not found." });
        return;
      }
  
      res.status(200).json({
        success: true,
        message: "Address deleted successfully.",
      });
  
      return;
    } catch (error) {
      next(error);
    }
  });





