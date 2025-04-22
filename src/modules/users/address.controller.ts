import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Address from "../address/address.models";
import User from "./users.models";
import { isValidObjectId } from "../../core/utils/validation";

// 📌 Kullanıcının tüm adreslerini getir
export const getUserAddresses = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const addresses = await Address.find({ userId });
    res.status(200).json(addresses);
  }
);

// 📌 Yeni adres oluştur
export const createAddress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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
      message: "Adres başarıyla eklendi.",
      address: newAddress,
    });
  }
);

// 📌 Tek bir adresi getir (ID)
export const getAddressById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Geçersiz adres ID formatı." });
      return;
    }

    const address = await Address.findById(id);
    if (!address) {
      res.status(404).json({ message: "Adres bulunamadı." });
      return;
    }

    res.status(200).json(address);
  }
);

// 📌 Adresi güncelle
export const updateAddress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { street, houseNumber, city, zipCode } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Geçersiz adres ID formatı." });
      return;
    }

    const updated = await Address.findByIdAndUpdate(
      id,
      { street, houseNumber, city, zipCode },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ message: "Adres bulunamadı." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Adres güncellendi.",
      address: updated,
    });
  }
);

// 📌 Adresi sil
export const deleteAddress = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Geçersiz adres ID formatı." });
      return;
    }

    const deleted = await Address.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Adres bulunamadı." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Adres silindi.",
    });
  }
);

export const updateAllUserAddresses = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user!.id;
    const newAddresses = req.body.addresses;

    if (!Array.isArray(newAddresses) || newAddresses.length === 0) {
      res.status(400);
      throw new Error("No addresses provided");
    }

    //1. Kullanicinin eski adreslerini sil
    const oldAddresses = await Address.find({ userId });
    if (oldAddresses.length > 0) {
      await Address.deleteMany({ userId });
    }
    //2. Yeni adresleri ekle
    const createdAddresses = await Address.insertMany(
      newAddresses.map((address: any, idx: number) => ({
        ...address,
        isDefault: idx === 0,
        userId,
      }))
    );

    //3. User modelindeki adres referanslarini güncelle
    const addressIds = createdAddresses.map((address) => address._id);
    await User.findByIdAndUpdate(userId, {
      addresses: addressIds,
    });

    res.status(200).json({
      success: true,
      message: "Adresler güncellendi.",
      addresses: createdAddresses,
    });
  }
);
