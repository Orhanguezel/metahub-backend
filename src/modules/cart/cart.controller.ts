import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { ICartItem } from "@/modules/cart/types";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import cartTranslations from "@/modules/cart/i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

function cartT(
  key: string,
  locale: SupportedLocale,
  vars?: Record<string, any>
) {
  return t(key, locale, cartTranslations, vars);
}

const recalculateTotal = (items: ICartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.priceAtAddition, 0);

// Her iki model için dinamik fetch!
const getProduct = async (
  req: Request,
  productId: string,
  productType: "Bike" | "Ensotekprod" | "Sparepart"
) => {
  const { Bike, Ensotekprod, Sparepart } = await getTenantModels(req);
  if (productType === "Ensotekprod") {
    return Ensotekprod.findOne({ _id: productId, tenant: req.tenant });
  }
  if (productType === "Sparepart") {
    return Sparepart.findOne({ _id: productId, tenant: req.tenant });
  }
  return Bike.findOne({ _id: productId, tenant: req.tenant });
};

// populate işlemi refPath ile çalışır!
const getCartForUser = async (
  req: Request,
  userId: string,
  populate = false
) => {
  const { Cart } = await getTenantModels(req);
  return populate
    ? Cart.findOne({ user: userId, tenant: req.tenant }).populate({
        path: "items.product",
        strictPopulate: false,
      })
    : Cart.findOne({ user: userId, tenant: req.tenant });
};

export const getUserCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  if (!userId) {
    logger.withReq.warn(req, cartT("cart.authRequired", locale));
    res
      .status(401)
      .json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  let cart = await getCartForUser(req, userId, true);
  if (!cart) {
    const { Cart } = await getTenantModels(req);
    cart = new Cart({
      user: userId,
      tenant: req.tenant,
      items: [],
      totalPrice: 0,
      couponCode: null,
      language: locale,
    });
    await cart.save();
    logger.withReq.info(req, cartT("cart.created", locale, { userId }));
    res.status(201).json({
      success: true,
      message: cartT("cart.created", locale),
      data: cart,
    });
    return;
  }

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();
  logger.withReq.info(req, cartT("cart.fetched", locale, { userId }));
  res.status(200).json({
    success: true,
    data: cart,
  });
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;
  const { productId, productType, quantity } = req.body;

  if (!userId || !productId || !productType || quantity <= 0) {
    logger.withReq.warn(req, cartT("cart.add.invalidInput", locale));
    res.status(400).json({
      success: false,
      message: cartT("cart.add.invalidInput", locale),
    });
    return;
  }

  const product = await getProduct(req, productId, productType);
  if (!product) {
    logger.withReq.warn(
      req,
      cartT("cart.add.productNotFound", locale, { productId })
    );
    res.status(404).json({
      success: false,
      message: cartT("cart.add.productNotFound", locale),
    });
    return;
  }

  if (product.stock < quantity) {
    logger.withReq.warn(
      req,
      cartT("cart.add.stockNotEnough", locale, { stock: product.stock })
    );
    res.status(400).json({
      success: false,
      message: cartT("cart.add.stockNotEnough", locale, {
        stock: product.stock,
      }),
    });
    return;
  }

  let cart = await getCartForUser(req, userId);
  if (!cart) {
    const { Cart } = await getTenantModels(req);
    cart = new Cart({
      user: userId,
      items: [],
      tenant: req.tenant,
      totalPrice: 0,
      couponCode: null,
      language: locale,
    });
  }

  const itemIndex = cart.items.findIndex(
    (item) =>
      item.product.toString() === productId && item.productType === productType
  );

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += quantity;
    cart.items[itemIndex].totalPriceAtAddition =
      cart.items[itemIndex].quantity * cart.items[itemIndex].priceAtAddition;
  } else {
    cart.items.push({
      product: Types.ObjectId.createFromHexString(productId),
      productType, // Bike | Ensotekprod
      tenant: req.tenant,
      quantity,
      priceAtAddition: product.price,
      totalPriceAtAddition: quantity * product.price,
    });
  }

  cart.totalPrice = recalculateTotal(cart.items);
  await cart.save();

  const isCritical = product.stock - quantity <= (product.stockThreshold || 5);
  const warning = isCritical
    ? cartT("cart.add.criticalStock", locale)
    : undefined;

  logger.withReq.info(
    req,
    cartT("cart.add.success", locale, { product: productId, userId })
  );
  res.status(201).json({
    success: true,
    message: cartT("cart.add.success", locale),
    data: cart,
    warning,
  });
});

export const increaseQuantity = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = (req.locale as SupportedLocale) || "en";
    const userId = req.user?.id;
    const { productId, productType } = req.body; // veya params (senin API'na göre)

    if (!userId || !productId || !productType) {
      logger.withReq.warn(req, cartT("cart.inc.invalidInput", locale));
      res.status(400).json({
        success: false,
        message: cartT("cart.inc.invalidInput", locale),
      });
      return;
    }

    const cart = await getCartForUser(req, userId, true);
    if (!cart) {
      logger.withReq.warn(req, cartT("cart.notFound", locale));
      res
        .status(404)
        .json({ success: false, message: cartT("cart.notFound", locale) });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        (item.product as any)._id?.toString() === productId &&
        item.productType === productType
    );
    if (itemIndex === -1) {
      logger.withReq.warn(req, cartT("cart.inc.notInCart", locale));
      res
        .status(404)
        .json({ success: false, message: cartT("cart.inc.notInCart", locale) });
      return;
    }

    const product = await getProduct(req, productId, productType);
    if (!product) {
      logger.withReq.warn(
        req,
        cartT("cart.add.productNotFound", locale, { productId })
      );
      res.status(404).json({
        success: false,
        message: cartT("cart.add.productNotFound", locale),
      });
      return;
    }

    if (cart.items[itemIndex].quantity >= product.stock) {
      logger.withReq.warn(req, cartT("cart.inc.stockLimit", locale));
      res.status(400).json({
        success: false,
        message: cartT("cart.inc.stockLimit", locale),
      });
      return;
    }

    cart.items[itemIndex].quantity += 1;
    cart.items[itemIndex].priceAtAddition = product.price;
    cart.items[itemIndex].totalPriceAtAddition =
      cart.items[itemIndex].quantity * product.price;

    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    const isCritical =
      product.stock - cart.items[itemIndex].quantity <=
      (product.stockThreshold || 5);
    const warning = isCritical
      ? cartT("cart.add.criticalStock", locale)
      : undefined;

    logger.withReq.info(
      req,
      cartT("cart.inc.success", locale, { product: productId, userId })
    );
    res.status(200).json({
      success: true,
      message: cartT("cart.inc.success", locale),
      data: cart,
      warning,
    });
  }
);

export const decreaseQuantity = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = (req.locale as SupportedLocale) || "en";
    const userId = req.user?.id;
    const { productId, productType } = req.body; // veya params

    if (!userId || !productId || !productType) {
      logger.withReq.warn(req, cartT("cart.dec.invalidInput", locale));
      res.status(400).json({
        success: false,
        message: cartT("cart.dec.invalidInput", locale),
      });
      return;
    }

    const cart = await getCartForUser(req, userId, true);
    if (!cart) {
      logger.withReq.warn(req, cartT("cart.notFound", locale));
      res
        .status(404)
        .json({ success: false, message: cartT("cart.notFound", locale) });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        (item.product as any)._id?.toString() === productId &&
        item.productType === productType
    );
    if (itemIndex === -1) {
      logger.withReq.warn(req, cartT("cart.dec.notInCart", locale));
      res
        .status(404)
        .json({ success: false, message: cartT("cart.dec.notInCart", locale) });
      return;
    }

    if (cart.items[itemIndex].quantity > 1) {
      cart.items[itemIndex].quantity -= 1;
      cart.items[itemIndex].totalPriceAtAddition =
        cart.items[itemIndex].quantity * cart.items[itemIndex].priceAtAddition;
    } else {
      cart.items.splice(itemIndex, 1);
    }

    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    logger.withReq.info(
      req,
      cartT("cart.dec.success", locale, { product: productId, userId })
    );
    res.status(200).json({
      success: true,
      message: cartT("cart.dec.success", locale),
      data: cart,
    });
  }
);

export const removeFromCart = asyncHandler(
  async (req: Request, res: Response) => {
    const locale = (req.locale as SupportedLocale) || "en";
    const userId = req.user?.id;
    const { productId, productType } = req.body; // veya params

    if (!userId || !productId || !productType) {
      logger.withReq.warn(req, cartT("cart.remove.invalidInput", locale));
      res.status(400).json({
        success: false,
        message: cartT("cart.remove.invalidInput", locale),
      });
      return;
    }

    const cart = await getCartForUser(req, userId, true);
    if (!cart) {
      logger.withReq.warn(req, cartT("cart.notFound", locale));
      res
        .status(404)
        .json({ success: false, message: cartT("cart.notFound", locale) });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        (item.product as any)._id?.toString() === productId &&
        item.productType === productType
    );
    if (itemIndex === -1) {
      logger.withReq.warn(req, cartT("cart.remove.notInCart", locale));
      res.status(404).json({
        success: false,
        message: cartT("cart.remove.notInCart", locale),
      });
      return;
    }

    cart.items.splice(itemIndex, 1);
    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    logger.withReq.info(
      req,
      cartT("cart.remove.success", locale, { product: productId, userId })
    );
    res.status(200).json({
      success: true,
      message: cartT("cart.remove.success", locale),
      data: cart,
    });
  }
);

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const locale = (req.locale as SupportedLocale) || "en";
  const userId = req.user?.id;

  if (!userId) {
    logger.withReq.warn(req, cartT("cart.authRequired", locale));
    res
      .status(401)
      .json({ success: false, message: cartT("cart.authRequired", locale) });
    return;
  }

  const cart = await getCartForUser(req, userId, true);
  if (!cart) {
    logger.withReq.warn(req, cartT("cart.notFound", locale));
    res
      .status(404)
      .json({ success: false, message: cartT("cart.notFound", locale) });
    return;
  }

  if (!cart.items.length) {
    logger.withReq.warn(req, cartT("cart.clear.alreadyEmpty", locale));
    res.status(400).json({
      success: false,
      message: cartT("cart.clear.alreadyEmpty", locale),
    });
    return;
  }

  cart.items = [];
  cart.totalPrice = 0;
  await cart.save();

  logger.withReq.info(req, cartT("cart.clear.success", locale, { userId }));
  res.status(200).json({
    success: true,
    message: cartT("cart.clear.success", locale),
    data: cart,
  });
});
