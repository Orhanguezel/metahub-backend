import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";

// --- Owner helper ---
function getOwner(req: Request): { field: "userId" | "companyId"; value: string } {
  const companyId = req.body.companyId || req.query.companyId || req.params.companyId;
  const userId = req.user?.id;
  if (companyId) return { field: "companyId", value: String(companyId) };
  if (userId) return { field: "userId", value: String(userId) };
  throw new Error("Owner (userId or companyId) is required.");
}


// ✅ Adresleri getir (user veya company için)
export const getAddresses = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address } = await getTenantModels(req);

  let owner: { field: "userId" | "companyId"; value: string };
  try {
    owner = getOwner(req);
  } catch (err: any) {
    res.status(400).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }
  const filter: any = { [owner.field]: owner.value, tenant: req.tenant };
  const addresses = await Address.find(filter).sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    message: t("addresses.fetched"),
    data: addresses,
  });
  return;
});

// ✅ Yeni adres oluştur (userId/companyId)
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address, User, Company } = await getTenantModels(req);

  let owner: { field: "userId" | "companyId"; value: string };
  try {
    owner = getOwner(req);
  } catch (err: any) {
    res.status(400).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }

  const { street, houseNumber, city, zipCode, country, phone, email, isDefault } = req.body;

  if (!email) {
    res.status(400).json({ success: false, message: t("addresses.emailRequired") });
    return;
  }

  const newAddress = await Address.create({
    [owner.field]: owner.value,
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

  // Adres id'sini User veya Company objesine ekle
  if (owner.field === "userId") {
    await User.findByIdAndUpdate(owner.value, { $push: { addresses: newAddress._id } });
  } else if (owner.field === "companyId") {
    await Company.findByIdAndUpdate(owner.value, { $push: { addresses: newAddress._id } });
  }

  res.status(201).json({
    success: true,
    message: t("addresses.created"),
    data: newAddress,
  });
  return;
});

// ✅ Tek adres getir
export const getAddressById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;
  const { Address } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }

  const address = await Address.findOne({ _id: id, tenant: req.tenant });
  if (!address) {
    res.status(404).json({ success: false, message: t("addresses.notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("addresses.fetched"),
    data: address,
  });
  return;
});

// ✅ Adres güncelle
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;
  const { Address } = await getTenantModels(req);
  const { street, houseNumber, city, zipCode, country, phone, email, isDefault } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }

  if (!email) {
    res.status(400).json({ success: false, message: t("addresses.emailRequired") });
    return;
  }

  const updated = await Address.findByIdAndUpdate(
    id,
    { street, houseNumber, city, zipCode, country, phone, email, isDefault },
    { new: true, runValidators: true }
  );

  if (!updated) {
    res.status(404).json({ success: false, message: t("addresses.notFound") });
    return;
  }

  res.status(200).json({
    success: true,
    message: t("addresses.updated"),
    data: updated,
  });
  return;
});

// ✅ Adres sil
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { id } = req.params;
  const { Address, User, Company } = await getTenantModels(req);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") });
    return;
  }

  // Adresi bul, owner'ı tespit et
  const address = await Address.findById(id);
  if (!address) {
    res.status(404).json({ success: false, message: t("addresses.notFound") });
    return;
  }

  // Owner tablosundan da sil
  if (address.userId) {
    await User.findByIdAndUpdate(address.userId, { $pull: { addresses: id } });
  }
  if (address.companyId) {
    await Company.findByIdAndUpdate(address.companyId, { $pull: { addresses: id } });
  }

  await Address.deleteOne({ _id: id, tenant: req.tenant });

  res.status(200).json({
    success: true,
    message: t("addresses.deleted"),
  });
  return;
});

// ✅ Tüm adresleri toplu güncelle (user/company dinamik)
export const updateAllAddresses = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address, User, Company } = await getTenantModels(req);

  let owner: { field: "userId" | "companyId"; value: string };
  try {
    owner = getOwner(req);
  } catch (err: any) {
    res.status(400).json({ success: false, message: t("addresses.ownerRequired") });
    return;
  }

  const newAddresses = req.body.addresses;
  if (!Array.isArray(newAddresses) || newAddresses.length === 0) {
    res.status(400).json({ success: false, message: t("addresses.noAddressesProvided") });
    return;
  }

  // Hepsini sil, yenileri ekle
  await Address.deleteMany({ [owner.field]: owner.value, tenant: req.tenant });

  const createdAddresses = await Address.insertMany(
    newAddresses.map((address: any, idx: number) => ({
      ...address,
      [owner.field]: owner.value,
      tenant: req.tenant,
      isDefault: idx === 0,
    }))
  );
  const addressIds = createdAddresses.map((address) => address._id);

  if (owner.field === "userId") {
    await User.findByIdAndUpdate(owner.value, { addresses: addressIds });
  } else if (owner.field === "companyId") {
    await Company.findByIdAndUpdate(owner.value, { addresses: addressIds });
  }

  res.status(200).json({
    success: true,
    message: t("addresses.updatedAll"),
    data: createdAddresses,
  });
  return;
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


