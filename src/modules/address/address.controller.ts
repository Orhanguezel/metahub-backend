import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Kullanıcının tüm adreslerini getir
export const getUserAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { Address } = await getTenantModels(req);

    const addresses = await Address.find({ userId, tenant: req.tenant }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      message: "User addresses fetched successfully.",
      data: addresses,
    });
  }
);

// ✅ Yeni adres oluştur
export const createAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { street, houseNumber, city, zipCode, country, phone, email, isDefault } = req.body;
    const { Address, User } = await getTenantModels(req);

    // ✅ Email zorunlu, backend ile frontend birebir!
    if (!email) {
      res.status(400).json({ success: false, message: "Email is required for address." });
      return;
    }

    const newAddress = await Address.create({
      userId,
      tenant: req.tenant,
      street,
      houseNumber,
      city,
      zipCode,
      country,
      phone,
      email,
      isDefault,
    });

    // User adres listesine ekle
    await User.findByIdAndUpdate(userId, { $push: { addresses: newAddress._id } });

    res.status(201).json({
      success: true,
      message: "Address created successfully.",
      data: newAddress,
    });
  }
);

// ✅ Tek adres getir
export const getAddressById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { Address } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid address ID." });
      return;
    }

    const address = await Address.findOne({ _id: id, tenant: req.tenant });
    if (!address) {
      res.status(404).json({ success: false, message: "Address not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Address fetched successfully.",
      data: address,
    });
  }
);

// ✅ Adres güncelle
export const updateAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { street, houseNumber, city, zipCode, country, phone, email, isDefault } = req.body;
    const { Address, User } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid address ID." });
      return;
    }

    if (!email) {
      res.status(400).json({ success: false, message: "Email is required for address." });
      return;
    }

    const updated = await Address.findByIdAndUpdate(
      id,
      {
        street,
        houseNumber,
        city,
        zipCode,
        country,
        phone,
        email,
        isDefault,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: "Address not found." });
      return;
    }

    // User içindeki adresi de güncelle (Mongoose array update)
    await User.findOneAndUpdate(
      { addresses: id },
      { $set: { "addresses.$": updated._id } }
    );

    res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      data: updated,
    });
  }
);

// ✅ Adres sil
export const deleteAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { Address, User } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid address ID." });
      return;
    }

    const deleted = await Address.deleteOne({ _id: id, tenant: req.tenant });
    if (!deleted) {
      res.status(404).json({ success: false, message: "Address not found." });
      return;
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { addresses: id },
    });

    res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
    });
  }
);

// ✅ Tüm adresleri toplu güncelle
export const updateAllUserAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const newAddresses = req.body.addresses;
    const { Address, User } = await getTenantModels(req);

    if (!Array.isArray(newAddresses) || newAddresses.length === 0) {
      res.status(400).json({ success: false, message: "No addresses provided." });
      return;
    }

    // Hepsini sil, yenileri ekle
    await Address.deleteMany({ userId, tenant: req.tenant });

    const createdAddresses = await Address.insertMany(
      newAddresses.map((address: any, idx: number) => ({
        ...address,
        userId,
        tenant: req.tenant,
        isDefault: idx === 0,
      }))
    );

    const addressIds = createdAddresses.map((address) => address._id);
    await User.findByIdAndUpdate(userId, { addresses: addressIds });

    res.status(200).json({
      success: true,
      message: "All addresses updated successfully.",
      data: createdAddresses,
    });
  }
);
