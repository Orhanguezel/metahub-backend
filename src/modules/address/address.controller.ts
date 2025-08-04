import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { ADDRESS_TYPE_OPTIONS } from "@/modules/address/types";

// OWNER tespiti (user > company > customer)
function getOwner(req: Request): { field: "userId" | "companyId" | "customerId"; value: string } {
  const customerId = req.body.customerId || req.query.customerId || req.params.customerId;
  const companyId = req.body.companyId || req.query.companyId || req.params.companyId;
  const userId = req.user?.id;
  if (customerId) return { field: "customerId", value: String(customerId) };
  if (companyId) return { field: "companyId", value: String(companyId) };
  if (userId) return { field: "userId", value: String(userId) };
  throw new Error("Owner (customerId, companyId veya userId) gereklidir.");
}


// Kullanılmaması gereken owner field'ları sil
function cleanOwnerFields(obj: any, allowed: "userId" | "companyId" | "customerId") {
  const all = ["userId", "companyId", "customerId"];
  for (const key of all) {
    if (key !== allowed && obj[key] !== undefined) delete obj[key];
  }
  return obj;
}


// ✅ Adresleri getir (owner bazlı)
export const getAddresses = asyncHandler(async (req, res) => {
  const { Address } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  let owner: { field: "userId" | "companyId" | "customerId"; value: string };
  try { owner = getOwner(req); }
  catch { res.status(400).json({ success: false, message: t("addresses.ownerRequired") }); return; }

  const addresses = await Address.find({ [owner.field]: owner.value, tenant: req.tenant }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, message: t("addresses.fetched"), data: addresses });
  return;
});

// ✅ Tekli adres oluştur
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);
  const { Address, User, Company, Customer } = await getTenantModels(req);

  let owner: { field: "userId" | "companyId" | "customerId"; value: string };
  try { owner = getOwner(req); }
  catch { res.status(400).json({ success: false, message: t("addresses.ownerRequired") }); return; }

  const { addressLine, addressType } = req.body;
  if (!addressLine || typeof addressLine !== "string" || !addressLine.trim()) {
    res.status(400).json({ success: false, message: t("addresses.addressLineRequired") }); return;
  }
  if (!ADDRESS_TYPE_OPTIONS.includes(addressType)) {
    res.status(400).json({ success: false, message: t("addresses.invalidType") }); return;
  }

  // Sadece owner field'ı kalsın
  let addressData = { ...req.body, tenant: req.tenant, [owner.field]: owner.value };
  addressData = cleanOwnerFields(addressData, owner.field);

  const newAddress = await Address.create(addressData);

  if (owner.field === "userId") {
    await User.findByIdAndUpdate(owner.value, { $addToSet: { addresses: newAddress._id } });
  } else if (owner.field === "companyId") {
    await Company.findByIdAndUpdate(owner.value, { $addToSet: { addresses: newAddress._id } });
  } else if (owner.field === "customerId") {
    await Customer.findByIdAndUpdate(owner.value, { $addToSet: { addresses: newAddress._id } });
  }

  res.status(201).json({ success: true, message: t("addresses.created"), data: newAddress });
  return;
});


// ✅ Tek adres getir
export const getAddressById = asyncHandler(async (req, res) => {
  const { Address } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") }); return;
  }

  const address = await Address.findOne({ _id: id, tenant: req.tenant });
  if (!address) {
    res.status(404).json({ success: false, message: t("addresses.notFound") }); return;
  }

  res.status(200).json({ success: true, message: t("addresses.fetched"), data: address });
  return;
});


export const updateAddress = asyncHandler(async (req, res) => {
  const { Address } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") }); return;
  }

  const { addressLine, addressType } = req.body;
  if (!addressLine || typeof addressLine !== "string" || !addressLine.trim()) {
    res.status(400).json({ success: false, message: t("addresses.addressLineRequired") }); return;
  }
  if (!ADDRESS_TYPE_OPTIONS.includes(addressType)) {
    res.status(400).json({ success: false, message: t("addresses.invalidType") }); return;
  }

  // Kayıt var mı ve doğru tenant mı?
  const address = await Address.findById(id);
  if (!address || String(address.tenant) !== String(req.tenant)) {
    res.status(404).json({ success: false, message: t("addresses.notFound") }); return;
  }

  // Burada update işlemi için doğru owner field'ını bul ve sadece onu bırak
  let ownerField: "userId" | "companyId" | "customerId" | null = null;
  if (address.userId) ownerField = "userId";
  if (address.companyId) ownerField = "companyId";
  if (address.customerId) ownerField = "customerId";

  if (!ownerField) {
    res.status(400).json({ success: false, message: t("addresses.ownerRequired") }); return;
  }

  // Güncellenecek veride sadece ilgili owner field'ı kalsın, diğerleri silinsin
  let updateData = { ...req.body, [ownerField]: address[ownerField] };
  updateData = cleanOwnerFields(updateData, ownerField);

  const updated = await Address.findByIdAndUpdate(id, updateData, {
    new: true, runValidators: true,
  });

  res.status(200).json({ success: true, message: t("addresses.updated"), data: updated });
  return;
});


// ✅ Adres sil (owner ve tenant check)
export const deleteAddress = asyncHandler(async (req, res) => {
  const { Address, User, Company, Customer } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("addresses.invalidId") }); return;
  }

  const address = await Address.findById(id);
  if (!address || String(address.tenant) !== String(req.tenant)) {
    res.status(404).json({ success: false, message: t("addresses.notFound") }); return;
  }

  await Address.deleteOne({ _id: id, tenant: req.tenant });

  // Ownerdan adres id'yi çıkar (hepsi explicit)
  if (address.userId) {
    await User.findByIdAndUpdate(address.userId, { $pull: { addresses: id } });
  }
  if (address.companyId) {
    await Company.findByIdAndUpdate(address.companyId, { $pull: { addresses: id } });
  }
  if (address.customerId) {
    await Customer.findByIdAndUpdate(address.customerId, { $pull: { addresses: id } });
  }

  res.status(200).json({ success: true, message: t("addresses.deleted") });
  return;
});

// ✅ Tüm adresleri toplu güncelle (owner bazlı, hepsi explicit)
export const updateAllAddresses = asyncHandler(async (req, res) => {
  const { Address, User, Company, Customer } = await getTenantModels(req);
  const locale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  let owner: { field: "userId" | "companyId" | "customerId"; value: string };
  try { owner = getOwner(req); }
  catch { res.status(400).json({ success: false, message: t("addresses.ownerRequired") }); return; }

  const addresses = req.body.addresses;
  if (!Array.isArray(addresses) || addresses.length === 0) {
    res.status(400).json({ success: false, message: t("addresses.noAddressesProvided") }); return;
  }
  for (const a of addresses) {
    if (!a.addressLine || typeof a.addressLine !== "string" || !a.addressLine.trim()) {
      res.status(400).json({ success: false, message: t("addresses.addressLineRequired") }); return;
    }
    if (!ADDRESS_TYPE_OPTIONS.includes(a.addressType)) {
      res.status(400).json({ success: false, message: t("addresses.invalidType") }); return;
    }
  }

  await Address.deleteMany({ [owner.field]: owner.value, tenant: req.tenant });

  const created = await Address.insertMany(
    addresses.map((a: any, i) => {
      let addr = { ...a, [owner.field]: owner.value, tenant: req.tenant, isDefault: i === 0 };
      return cleanOwnerFields(addr, owner.field);
    })
  );

  const ids = created.map((a) => a._id);

  // Her owner tipi için explicit set
  if (owner.field === "userId") {
    await User.findByIdAndUpdate(owner.value, { addresses: ids });
  }
  if (owner.field === "companyId") {
    await Company.findByIdAndUpdate(owner.value, { addresses: ids });
  }
  if (owner.field === "customerId") {
    await Customer.findByIdAndUpdate(owner.value, { addresses: ids });
  }

  res.status(200).json({ success: true, message: t("addresses.updatedAll"), data: created });
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

  // Adresleri kontrol et (her adres zorunlu alanlar)
  for (const a of newAddresses) {
    if (!a.addressLine || typeof a.addressLine !== "string" || !a.addressLine.trim()) {
      res.status(400).json({ success: false, message: t("addresses.addressLineRequired") });
      return;
    }
    if (!ADDRESS_TYPE_OPTIONS.includes(a.addressType)) {
      res.status(400).json({ success: false, message: t("addresses.invalidType") });
      return;
    }
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
