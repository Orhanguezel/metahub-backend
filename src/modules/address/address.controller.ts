import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

export const getUserAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { Address } = await getTenantModels(req);

    const addresses = await Address.find({ userId, tenant: req.tenant }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "User addresses fetched successfully.",
      data: addresses,
    });
  }
);

export const createAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { street, houseNumber, city, zipCode, country, phone, isDefault } =
      req.body;
    const { Address, User } = await getTenantModels(req);

    const newAddress = await Address.create({
      userId,
      street,
      houseNumber,
      city,
      zipCode,
      tenant: req.tenant, // 🟢 Eklendi
      country,
      phone,
      isDefault,
    });

    await User.findByIdAndUpdate(
      userId,
      { tenant: req.tenant },
      {
        $push: { addresses: newAddress._id },
      }
    );

    res.status(201).json({
      success: true,
      message: "Address created successfully.",
      data: newAddress,
    });
  }
);

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

export const updateAddress = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { street, houseNumber, city, zipCode, country, phone, isDefault } =
      req.body;
    const { Address, User } = await getTenantModels(req);

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid address ID." });
      return;
    }

    const updated = await Address.findByIdAndUpdate(
      id,
      {
        tenant: req.tenant,
        street,
        houseNumber,
        city,
        zipCode,
        country,
        phone,
        isDefault,
      }, // 🟢 Eklendi
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: "Address not found." });
      return;
    }

    await User.findOneAndUpdate(
      { addresses: id },
      { $set: { "addresses.$": updated._id } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      data: updated,
    });
  }
);

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

export const updateAllUserAddresses = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const newAddresses = req.body.addresses;
    const { Address, User } = await getTenantModels(req);

    if (!Array.isArray(newAddresses) || newAddresses.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "No addresses provided." });
      return;
    }

    await Address.deleteMany({ userId, tenant: req.tenant });

    const createdAddresses = await Address.insertMany(
      newAddresses.map((address: any, idx: number) => ({
        ...address,
        isDefault: idx === 0,
        userId,
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
