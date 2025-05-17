import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import {Address} from "@/modules/address";
import {User} from "@/modules/users";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Kullanıcının tüm adreslerini getir
export const getUserAddresses = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "User addresses fetched successfully.",
    data: addresses,
  });
});

// ✅ Yeni adres oluştur
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { street, houseNumber, city, zipCode } = req.body;

  const newAddress = await Address.create({
    userId,
    street,
    houseNumber,
    city,
    zipCode,
  });

  res.status(201).json({
    success: true,
    message: "Address created successfully.",
    data: newAddress,
  });
});


// ✅ Tek bir adresi getir (ID)
export const getAddressById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid address ID." });
    return;
  }

  const address = await Address.findById(id);
  if (!address) {
    res.status(404).json({ success: false, message: "Address not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Address fetched successfully.",
    data: address,
  });
});

// ✅ Adresi güncelle
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { street, houseNumber, city, zipCode } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid address ID." });
    return;
  }

  const updated = await Address.findByIdAndUpdate(
    id,
    { street, houseNumber, city, zipCode },
    { new: true, runValidators: true }
  );

  if (!updated) {
    res.status(404).json({ success: false, message: "Address not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Address updated successfully.",
    data: updated,
  });
});

// ✅ Adresi sil
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid address ID." });
    return;
  }

  const deleted = await Address.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({ success: false, message: "Address not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Address deleted successfully.",
  });
});

// ✅ Tüm adresleri topluca güncelle (replace)
export const updateAllUserAddresses = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const newAddresses = req.body.addresses;

  if (!Array.isArray(newAddresses) || newAddresses.length === 0) {
    res.status(400).json({ success: false, message: "No addresses provided." });
    return;
  }

  // 1️⃣ Eski adresleri sil
  await Address.deleteMany({ userId });

  // 2️⃣ Yeni adresleri ekle
  const createdAddresses = await Address.insertMany(
    newAddresses.map((address: any, idx: number) => ({
      ...address,
      isDefault: idx === 0,
      userId,
    }))
  );

  // 3️⃣ User modelindeki adres referanslarını güncelle
  const addressIds = createdAddresses.map((address) => address._id);
  await User.findByIdAndUpdate(userId, { addresses: addressIds });

  res.status(200).json({
    success: true,
    message: "All addresses updated successfully.",
    data: createdAddresses,
  });
});
