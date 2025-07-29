import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { ADDRESS_TYPE_OPTIONS } from "@/modules/address/types";

// Owner tespiti
function getOwner(req: Request): { field: "userId" | "companyId"; value: string } {
  const companyId = req.body.companyId || req.query.companyId || req.params.companyId;
  const userId = req.user?.id;
  if (companyId) return { field: "companyId", value: String(companyId) };
  if (userId) return { field: "userId", value: String(userId) };
  throw new Error("Owner (userId or companyId) is required.");
}

// ✅ Adresleri getir (user veya company için)
export const getAddresses = asyncHandler(async (req, res) => {
  const { Address } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  let owner;

  try {
    owner = getOwner(req);
  } catch {
    res.status(400).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }

  const addresses = await Address.find({ [owner.field]: owner.value, tenant: req.tenant }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, message: t("addresses.fetched"), data: addresses });
});

// ✅ Tekli adres oluştur
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address, User, Company } = await getTenantModels(req);

  let owner;
  try {
    owner = getOwner(req);
  } catch {
    res.status(400).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }

  const { addressLine, addressType } = req.body;
  if (!addressLine || typeof addressLine !== "string" || !addressLine.trim()) {
    res.status(400).json({ success: false, message: t("addresses.addressLineRequired") });
    return;
  }
  if (!ADDRESS_TYPE_OPTIONS.includes(addressType)) {
    res.status(400).json({ success: false, message: t("addresses.invalidType") });
    return;
  }

  const newAddress = await Address.create({
    ...req.body,
    tenant: req.tenant,
    [owner.field]: owner.value,
  });

  if (owner.field === "userId") {
    await User.findByIdAndUpdate(owner.value, { $push: { addresses: newAddress._id } });
  } else {
    await Company.findByIdAndUpdate(owner.value, { $push: { addresses: newAddress._id } });
  }

  res.status(201).json({ success: true, message: t("addresses.created"), data: newAddress });
});

// ✅ Tek adres getir
export const getAddressById = asyncHandler(async (req, res) => {
  const { Address } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }

  const address = await Address.findOne({ _id: id, tenant: req.tenant });
  if (!address) {
    res.status(404).json({ success: false, message: t("addresses.notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("addresses.fetched"), data: address });
});

// ✅ Adres güncelle
export const updateAddress = asyncHandler(async (req, res) => {
  const { Address } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }

  const { addressLine, addressType } = req.body;
  if (!addressLine || typeof addressLine !== "string" || !addressLine.trim()) {
    res.status(400).json({ success: false, message: t("addresses.addressLineRequired") });
    return;
  }
  if (!ADDRESS_TYPE_OPTIONS.includes(addressType)) {
    res.status(400).json({ success: false, message: t("addresses.invalidType") });
    return;
  }

  const updated = await Address.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    res.status(404).json({ success: false, message: t("addresses.notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("addresses.updated"), data: updated });
});

// ✅ Adres sil
export const deleteAddress = asyncHandler(async (req, res) => {
  const { Address, User, Company } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }

  const address = await Address.findById(id);
  if (!address) {
    res.status(404).json({ success: false, message: t("addresses.notFound") });
    return;
  }

  await Address.deleteOne({ _id: id, tenant: req.tenant });

  if (address.userId) {
    await User.findByIdAndUpdate(address.userId, { $pull: { addresses: id } });
  } else if (address.companyId) {
    await Company.findByIdAndUpdate(address.companyId, { $pull: { addresses: id } });
  }

  res.status(200).json({ success: true, message: t("addresses.deleted") });
});

// ✅ Tüm adresleri toplu güncelle (user/company dinamik)
export const updateAllAddresses = asyncHandler(async (req, res) => {
  const { Address, User, Company } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  let owner;

  try {
    owner = getOwner(req);
  } catch {
    res.status(400).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }

  const addresses = req.body.addresses;
  if (!Array.isArray(addresses) || addresses.length === 0) {
    res.status(400).json({ success: false, message: t("addresses.noAddressesProvided") });
    return;
  }
  // Her bir adres için addressLine zorunlu!
  for (const a of addresses) {
    if (!a.addressLine || typeof a.addressLine !== "string" || !a.addressLine.trim()) {
      res.status(400).json({ success: false, message: t("addresses.addressLineRequired") });
      return;
    }
    if (!ADDRESS_TYPE_OPTIONS.includes(a.addressType)) {
      res.status(400).json({ success: false, message: t("addresses.invalidType") });
      return;
    }
  }

  await Address.deleteMany({ [owner.field]: owner.value, tenant: req.tenant });

  const created = await Address.insertMany(
    addresses.map((a: any, i) => ({
      ...a,
      [owner.field]: owner.value,
      tenant: req.tenant,
      isDefault: i === 0,
    }))
  );

  const ids = created.map((a) => a._id);
  if (owner.field === "userId") {
    await User.findByIdAndUpdate(owner.value, { addresses: ids });
  } else {
    await Company.findByIdAndUpdate(owner.value, { addresses: ids });
  }

  res.status(200).json({ success: true, message: t("addresses.updatedAll"), data: created });
});



// ✅ Sadece kullanıcının adresleri
export const getUserAddresses = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address } = await getTenantModels(req);
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }

  const addresses = await Address.find({ userId, tenant: req.tenant }).sort({ createdAt: -1 }).lean();
  res.status(200).json({
    success: true,
    message: t("addresses.fetched"),
    data: addresses,
  });
  return;
});

// ✅ Sadece kullanıcının adreslerini topluca güncelle
export const updateAllUserAddresses = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address, User } = await getTenantModels(req);
  const userId = req.user?.id;
  const newAddresses = req.body.addresses;

  if (!userId) {
    res.status(401).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }
  if (!Array.isArray(newAddresses) || newAddresses.length === 0) {
    res.status(400).json({ success: false, message: t("addresses.noAddressesProvided") });
    return;
  }

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
    message: t("addresses.updatedAll"),
    data: createdAddresses,
  });
  return;
});

// ✅ Sadece bir şirketin adresleri
export const getCompanyAddresses = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address } = await getTenantModels(req);
  const companyId = req.params.companyId;

  if (!companyId || !isValidObjectId(companyId)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }

  const addresses = await Address.find({ companyId, tenant: req.tenant }).sort({ createdAt: -1 }).lean();
  res.status(200).json({
    success: true,
    message: t("addresses.fetched"),
    data: addresses,
  });
  return;
});

// ✅ Bir şirketin adreslerini topluca güncelle
export const updateAllCompanyAddresses = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address, Company } = await getTenantModels(req);
  const companyId = req.params.companyId;
  const newAddresses = req.body.addresses;

  if (!companyId || !isValidObjectId(companyId)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }
  if (!Array.isArray(newAddresses) || newAddresses.length === 0) {
    res.status(400).json({ success: false, message: t("addresses.noAddressesProvided") });
    return;
  }

  await Address.deleteMany({ companyId, tenant: req.tenant });
  const createdAddresses = await Address.insertMany(
    newAddresses.map((address: any, idx: number) => ({
      ...address,
      companyId,
      tenant: req.tenant,
      isDefault: idx === 0,
    }))
  );
  const addressIds = createdAddresses.map((address) => address._id);
  await Company.findByIdAndUpdate(companyId, { addresses: addressIds });

  res.status(200).json({
    success: true,
    message: t("addresses.updatedAll"),
    data: createdAddresses,
  });
  return;
});


