import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

// ✅ Tüm müşterileri getir
export const getAllCustomers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Customer } = await getTenantModels(req);
    const customers = await Customer.find({ tenant: req.tenant })
      .populate("addresses")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: t("customer.success.fetched"),
      data: customers,
    });
    logger.info(t("customer.success.fetched"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.getAll",
      status: "success",
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ ID ile müşteri getir
export const getCustomerById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Customer } = await getTenantModels(req);
    const customer = await Customer.findOne({ _id: req.params.id, tenant: req.tenant })
      .populate("addresses");

    if (!customer) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      logger.warn(t("customer.errors.notFound"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.getById",
        status: "fail",
        customerId: req.params.id,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
    logger.info(t("customer.success.fetched"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.getById",
      status: "success",
      customerId: req.params.id,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Müşteri oluştur
// ✅ Müşteri oluştur (adres opsiyonel, company mantığıyla aynı)
export const createCustomer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Customer, Address } = await getTenantModels(req);
    const { companyName, contactName, email, phone, addresses, notes } = req.body;

    // Zorunlu alan kontrolü (adres yok!)
    if (
      !companyName ||
      !contactName ||
      !email ||
      !phone
    ) {
      res.status(400).json({ success: false, message: t("customer.errors.requiredFields") });
      logger.warn(t("customer.errors.requiredFields"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.create",
        status: "fail",
      });
      return;
    }

    // Aynı tenantta aynı email varsa hata
    const existing = await Customer.findOne({ tenant: req.tenant, email });
    if (existing) {
      res.status(409).json({ success: false, message: t("customer.errors.emailExists") });
      logger.warn(t("customer.errors.emailExists"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.create",
        status: "fail",
        email,
      });
      return;
    }

    // Adresler (varsa) eklenir, yoksa boş array
    let addressIds: any[] = [];
    if (addresses && Array.isArray(addresses) && addresses.length > 0) {
      for (const address of addresses) {
        const addr = await Address.create({ ...address, tenant: req.tenant, customerId: null });
        addressIds.push(addr._id);
      }
    }

    const customer = await Customer.create({
      tenant: req.tenant,
      companyName,
      contactName,
      email,
      phone,
      addresses: addressIds,
      notes,
    });

    // Adreslere customerId ekle (varsa)
    if (addressIds.length > 0) {
      await Address.updateMany({ _id: { $in: addressIds } }, { $set: { customerId: customer._id } });
    }

    // Müşteriyle beraber adresleri de populate dön
    const createdCustomer = await Customer.findById(customer._id).populate("addresses");

    res.status(201).json({
      success: true,
      message: t("customer.success.created"),
      data: createdCustomer,
    });
    logger.info(t("customer.success.created"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.create",
      status: "success",
      customerId: customer._id,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Müşteri güncelle (adres company gibi opsiyonel & array olarak)
export const updateCustomer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Customer, Address } = await getTenantModels(req);

    // Eski müşteri kaydını bul
    const customer = await Customer.findOne({ _id: req.params.id, tenant: req.tenant });
    if (!customer) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      logger.warn(t("customer.errors.notFound"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.update",
        status: "fail",
        customerId: req.params.id,
      });
      return;
    }

    // Adres güncelleme (company mantığı ile)
    let addressIds: any[] = customer.addresses || [];
    if ("addresses" in req.body && Array.isArray(req.body.addresses)) {
      addressIds = [];
      for (const address of req.body.addresses) {
        // Eğer address._id varsa update et, yoksa yeni oluştur
        if (address._id) {
          await Address.findByIdAndUpdate(address._id, address, { new: true });
          addressIds.push(address._id);
        } else {
          const newAddr = await Address.create({ ...address, tenant: req.tenant, customerId: customer._id });
          addressIds.push(newAddr._id);
        }
      }
    }

    // Customer alanlarını güncelle
    const updates: any = {
      ...req.body,
      addresses: addressIds
    };

    // Adresler hariç tüm alanları güncelle
    Object.keys(updates).forEach(field => {
      if (typeof updates[field] !== "undefined") {
        (customer as any)[field] = updates[field];
      }
    });

    await customer.save();
    const updated = await Customer.findById(customer._id).populate("addresses");

    res.status(200).json({
      success: true,
      message: t("customer.success.updated"),
      data: updated,
    });
    logger.info(t("customer.success.updated"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.update",
      status: "success",
      customerId: req.params.id,
    });
    return;
  } catch (error) {
    next(error);
  }
});


// ✅ Müşteri sil
export const deleteCustomer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Customer, Address } = await getTenantModels(req);
    const deleted = await Customer.findOneAndDelete({ _id: req.params.id, tenant: req.tenant });

    if (!deleted) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      logger.warn(t("customer.errors.notFound"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.delete",
        status: "fail",
        customerId: req.params.id,
      });
      return;
    }

    // İlgili adresleri de sil (isteğe bağlı, eğer orphan kalmasın istiyorsan)
    await Address.deleteMany({ customerId: req.params.id });

    res.status(200).json({
      success: true,
      message: t("customer.success.deleted"),
      id: req.params.id,
    });
    logger.info(t("customer.success.deleted"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.delete",
      status: "success",
      customerId: req.params.id,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ PUBLIC: Müşteri kendi bilgilerini günceller (sadece izin verilen alanlar, adres yok!)
export const updateCustomerPublic = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Customer } = await getTenantModels(req);

    // Kimlik kontrolü
    const authUserId = req.user?._id?.toString?.() || req.user?.id?.toString?.();
    if (!authUserId) {
      res.status(401).json({ success: false, message: t("customer.errors.unauthorized") });
      return;
    }
    if (authUserId !== req.params.id) {
      res.status(403).json({ success: false, message: t("customer.errors.forbidden") });
      return;
    }

    // Müşteri kaydını bul
    const customer = await Customer.findOne({ _id: req.params.id, tenant: req.tenant });
    if (!customer) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      return;
    }

    // Sadece belirli alanlar güncellenebilir (adres hariç!)
    const allowedFields = ["companyName", "contactName", "email", "phone", "notes"];
    let updatedFields: any = {};
    allowedFields.forEach((field) => {
      if (typeof req.body[field] !== "undefined") {
        updatedFields[field] = req.body[field];
      }
    });

    // Email değişiyorsa başka müşteriyle çakışmasın
    if (
      updatedFields.email &&
      updatedFields.email !== customer.email
    ) {
      const exists = await Customer.findOne({ email: updatedFields.email, tenant: req.tenant });
      if (exists) {
        res.status(409).json({ success: false, message: t("customer.errors.emailExists") });
        return;
      }
    }

    // Update ve dön
    Object.assign(customer, updatedFields);
    await customer.save();

    res.status(200).json({
      success: true,
      message: t("customer.success.updated"),
      data: customer,
    });
    return;
  } catch (error) {
    next(error);
  }
});


// ✅ PUBLIC: Müşteri kendi kaydını görebilir
export const getCustomerPublicById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const { Customer } = await getTenantModels(req);

    // Kimlik kontrolü
    const authUserId = req.user?._id?.toString?.() || req.user?.id?.toString?.();
    if (!authUserId) {
      res.status(401).json({ success: false, message: t("customer.errors.unauthorized") });
      return;
    }
    if (authUserId !== req.params.id) {
      res.status(403).json({ success: false, message: t("customer.errors.forbidden") });
      return;
    }

    // Sadece kendi kaydını çekebilir!
    const customer = await Customer.findOne({ _id: req.params.id, tenant: req.tenant }).populate("addresses");
    if (!customer) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      return;
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
    return;
  } catch (error) {
    next(error);
  }
});


