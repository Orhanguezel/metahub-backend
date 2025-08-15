import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const normEmail = (s?: string) => (s || "").trim().toLowerCase();
const normPhone = (s?: string) => {
  if (!s) return s;
  let v = s.trim().replace(/[\s()-]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  v = v.replace(/(?!^\+)\+/g, "");
  v = v.replace(/[^\d+]/g, "");
  return v;
};

const fillFromUser = async (models: any, userRef?: string | null) => {
  if (!userRef) return null;
  const { User } = models;
  if (!User) return null; // tenant set’inde User modeli yoksa sessiz geç
  const u = await User.findOne({ _id: userRef, tenant: models.req?.tenant ?? undefined }) || await User.findById(userRef);
  if (!u) return null;

  // isim için olası alanlar
  const name =
    u.fullName?.trim?.() ||
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
    u.name?.trim?.() ||
    u.username?.trim?.() ||
    u.email?.split?.("@")?.[0] ||
    "";

  return {
    contactName: name || undefined,
    email: u.email || undefined,
    phone: (u.phone?.e164 || u.phone || undefined) as string | undefined,
  };
};

/* -------- LIST -------- */
export const getAllCustomers = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const { Customer } = await getTenantModels(req);
    const { q, kind, isActive } = req.query as Record<string, string>;
    const filter: any = { tenant: req.tenant };

    if (kind && ["person", "organization"].includes(kind)) filter.kind = kind;
    if (typeof isActive === "string") filter.isActive = isActive === "true";

    if (q?.trim()) {
      const r = new RegExp(q.trim(), "i");
      filter.$or = [
        { companyName: r },
        { contactName: r },
        { email: r },
        { phone: r },
        { slug: r },
        { tags: r },
      ];
    }

    const customers = await Customer.find(filter).populate("addresses").sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: t("customer.success.fetched"), data: customers });

    logger.withReq.info(req, t("customer.success.fetched"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.getAll",
      status: "success",
      resultCount: customers.length,
    });
  } catch (error) { next(error); }
});

/* -------- GET BY ID -------- */
export const getCustomerById = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const { Customer } = await getTenantModels(req);
    const customer = await Customer.findOne({ _id: req.params.id, tenant: req.tenant }).populate("addresses");

    if (!customer) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      logger.withReq.warn(req, t("customer.errors.notFound"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.getById",
        status: "fail",
        customerId: req.params.id,
      });
      return;
    }

    res.status(200).json({ success: true, message: t("customer.success.fetched"), data: customer });
    logger.withReq.info(req, t("customer.success.fetched"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.getById",
      status: "success",
      customerId: req.params.id,
    });
  } catch (error) { next(error); }
});

/* -------- CREATE -------- */
// companyName artık opsiyonel; userRef destekli
export const createCustomer = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const models = await getTenantModels(req);
    const { Customer, Address } = models;
    const {
      kind,
      companyName,
      contactName,
      email,
      phone,
      addresses,
      billing,
      tags,
      notes,
      slug,
      isActive,
      userRef, // NEW
    } = req.body;

    // userRef varsa eksik alanları user’dan doldurmaya çalış
    let snap = await fillFromUser(models, userRef);
    const finalContact = (contactName || snap?.contactName || "").trim();
    const finalEmail   = normEmail(email || snap?.email);
    const finalPhone   = normPhone(phone || snap?.phone);

    // zorunlular (companyName değil)
    if (!finalContact || !finalEmail || !finalPhone) {
      res.status(400).json({ success: false, message: t("customer.errors.requiredFields") });
      logger.withReq.warn(req, t("customer.errors.requiredFields"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.create",
        status: "fail",
      });
      return;
    }

    // benzersizlik
    const existingEmail = await Customer.findOne({ tenant: req.tenant, email: finalEmail });
    if (existingEmail) { res.status(409).json({ success: false, message: t("customer.errors.emailExists") }); return; }

    const existingPhone = await Customer.findOne({ tenant: req.tenant, phone: finalPhone });
    if (existingPhone) { res.status(409).json({ success: false, message: t("customer.errors.phoneExists") }); return; }

    if (userRef) {
      const dupUser = await Customer.findOne({ tenant: req.tenant, userRef });
      if (dupUser) { res.status(409).json({ success: false, message: t("customer.errors.userLinked") }); return; }
    }

    // adresler
    let addressIds: any[] = [];
    if (Array.isArray(addresses) && addresses.length > 0) {
      for (const address of addresses) {
        const addr = await Address.create({ ...address, tenant: req.tenant, customerId: null });
        addressIds.push(addr._id);
      }
    }

    const customer = await Customer.create({
      tenant: req.tenant,
      kind: kind || "person",
      companyName,
      contactName: finalContact,
      email: finalEmail,
      phone: finalPhone,
      userRef: userRef || null, // NEW
      addresses: addressIds,
      billing: billing || undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      notes,
      slug,
      isActive: isActive === "false" ? false : isActive === false ? false : true,
    });

    if (addressIds.length > 0) {
      await Address.updateMany({ _id: { $in: addressIds } }, { $set: { customerId: customer._id } });
    }

    const created = await Customer.findById(customer._id).populate("addresses");
    res.status(201).json({ success: true, message: t("customer.success.created"), data: created });
    logger.withReq.info(req, t("customer.success.created"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.create",
      status: "success",
      customerId: customer._id,
    });
  } catch (error) { next(error); }
});

/* -------- UPDATE -------- */
export const updateCustomer = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const models = await getTenantModels(req);
    const { Customer, Address } = models;
    const customer = await Customer.findOne({ _id: req.params.id, tenant: req.tenant });
    if (!customer) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      logger.withReq.warn(req, t("customer.errors.notFound"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.update",
        status: "fail",
        customerId: req.params.id,
      });
      return;
    }

    const {
      kind,
      companyName,
      contactName,
      email,
      phone,
      addresses,
      billing,
      tags,
      notes,
      slug,
      isActive,
      userRef, // NEW (set/clear)
    } = req.body || {};

    // addresses (tam liste)
    let addressIds: any[] = Array.isArray(customer.addresses) ? [...customer.addresses] : [];
    if (Array.isArray(addresses)) {
      addressIds = [];
      for (const address of addresses) {
        if (address?._id) {
          await Address.findByIdAndUpdate(address._id, address, { new: true });
          addressIds.push(address._id);
        } else {
          const newAddr = await Address.create({ ...address, tenant: req.tenant, customerId: customer._id });
          addressIds.push(newAddr._id);
        }
      }
      (customer as any).addresses = addressIds;
    }

    // userRef değişimi
    if (typeof userRef !== "undefined") {
      if (userRef) {
        const dupUser = await Customer.findOne({ tenant: req.tenant, userRef, _id: { $ne: customer._id } });
        if (dupUser) { res.status(409).json({ success: false, message: t("customer.errors.userLinked") }); return; }

        // eksik alanları user’dan doldur (yalnızca gönderilmemişse)
        const snap = await fillFromUser(models, userRef);
        if (snap?.contactName && typeof contactName === "undefined" && !customer.contactName) customer.contactName = snap.contactName;
        if (snap?.email && typeof email === "undefined" && !customer.email) customer.email = normEmail(snap.email);
        if (snap?.phone && typeof phone === "undefined" && !customer.phone) customer.phone = normPhone(snap.phone);

        (customer as any).userRef = userRef;
      } else {
        (customer as any).userRef = null;
      }
    }

    // benzersizlik (email/phone değişirse)
    if (typeof email !== "undefined") {
      const emailNorm = normEmail(email);
      if (emailNorm !== customer.email) {
        const exists = await Customer.findOne({ tenant: req.tenant, email: emailNorm, _id: { $ne: customer._id } });
        if (exists) { res.status(409).json({ success: false, message: t("customer.errors.emailExists") }); return; }
        customer.email = emailNorm;
      }
    }
    if (typeof phone !== "undefined") {
      const phoneNorm = normPhone(phone);
      if (phoneNorm !== customer.phone) {
        const exists = await Customer.findOne({ tenant: req.tenant, phone: phoneNorm, _id: { $ne: customer._id } });
        if (exists) { res.status(409).json({ success: false, message: t("customer.errors.phoneExists") }); return; }
        customer.phone = phoneNorm!;
      }
    }

    if (typeof kind !== "undefined") customer.kind = kind;
    if (typeof companyName !== "undefined") customer.companyName = companyName;
    if (typeof contactName !== "undefined") customer.contactName = contactName;
    if (typeof notes !== "undefined") customer.notes = notes;
    if (typeof slug !== "undefined") (customer as any).slug = slug;
    if (typeof isActive !== "undefined") customer.isActive = isActive === "true" || isActive === true;

    if (typeof billing !== "undefined") (customer as any).billing = billing || undefined;
    if (typeof tags !== "undefined") (customer as any).tags = Array.isArray(tags) ? tags : undefined;

    await customer.save();
    const updated = await Customer.findById(customer._id).populate("addresses");
    res.status(200).json({ success: true, message: t("customer.success.updated"), data: updated });
    logger.withReq.info(req, t("customer.success.updated"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.update",
      status: "success",
      customerId: req.params.id,
    });
  } catch (error) { next(error); }
});

/* -------- DELETE -------- */
export const deleteCustomer = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const { Customer, Address } = await getTenantModels(req);
    const deleted = await Customer.findOneAndDelete({ _id: req.params.id, tenant: req.tenant });

    if (!deleted) {
      res.status(404).json({ success: false, message: t("customer.errors.notFound") });
      logger.withReq.warn(req, t("customer.errors.notFound"), {
        ...getRequestContext(req),
        module: "customer",
        event: "customer.delete",
        status: "fail",
        customerId: req.params.id,
      });
      return;
    }

    await Address.deleteMany({ customerId: req.params.id }); // orphans cleanup (opsiyonel)
    res.status(200).json({ success: true, message: t("customer.success.deleted"), id: req.params.id });
    logger.withReq.info(req, t("customer.success.deleted"), {
      ...getRequestContext(req),
      module: "customer",
      event: "customer.delete",
      status: "success",
      customerId: req.params.id,
    });
  } catch (error) { next(error); }
});

/* -------- PUBLIC -------- */
// Public: kullanıcı kendi müşteri kaydını okuyup güncelleyebilsin.
// :id param’ı ya customer._id ya da auth user id olabilir (geri uyumluluk).
export const updateCustomerPublic = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const { Customer } = await getTenantModels(req);

    const authUserId = req.user?._id?.toString?.() || (req.user as any)?.id?.toString?.();
    if (!authUserId) { res.status(401).json({ success: false, message: t("customer.errors.unauthorized") }); return; }

    const isUserId = authUserId === req.params.id;
    const filter = isUserId
      ? { tenant: req.tenant, userRef: authUserId }
      : { tenant: req.tenant, _id: req.params.id };

    const customer = await Customer.findOne(filter);
    if (!customer) { res.status(404).json({ success: false, message: t("customer.errors.notFound") }); return; }

    const allowedFields = ["companyName", "contactName", "email", "phone", "notes"];
    const updates: any = {};
    for (const f of allowedFields) if (typeof req.body[f] !== "undefined") updates[f] = req.body[f];

    if (typeof updates.email !== "undefined") {
      const emailNorm = normEmail(updates.email);
      if (emailNorm !== customer.email) {
        const exists = await Customer.findOne({ tenant: req.tenant, email: emailNorm, _id: { $ne: customer._id } });
        if (exists) { res.status(409).json({ success: false, message: t("customer.errors.emailExists") }); return; }
        updates.email = emailNorm;
      }
    }
    if (typeof updates.phone !== "undefined") {
      const phoneNorm = normPhone(updates.phone);
      if (phoneNorm !== customer.phone) {
        const exists = await Customer.findOne({ tenant: req.tenant, phone: phoneNorm, _id: { $ne: customer._id } });
        if (exists) { res.status(409).json({ success: false, message: t("customer.errors.phoneExists") }); return; }
        updates.phone = phoneNorm;
      }
    }

    Object.assign(customer, updates);
    await customer.save();

    res.status(200).json({ success: true, message: t("customer.success.updated"), data: customer });
  } catch (error) { next(error); }
});

export const getCustomerPublicById = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const { Customer } = await getTenantModels(req);

    const authUserId = req.user?._id?.toString?.() || (req.user as any)?.id?.toString?.();
    if (!authUserId) { res.status(401).json({ success: false, message: t("customer.errors.unauthorized") }); return; }

    const isUserId = authUserId === req.params.id;
    const filter = isUserId
      ? { tenant: req.tenant, userRef: authUserId }
      : { tenant: req.tenant, _id: req.params.id };

    const customer = await Customer.findOne(filter).populate("addresses");
    if (!customer) { res.status(404).json({ success: false, message: t("customer.errors.notFound") }); return; }

    res.status(200).json({ success: true, message: t("customer.success.fetched"), data: customer });
  } catch (error) { next(error); }
});
