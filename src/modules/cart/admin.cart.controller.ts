import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "@/core/utils/validation";
//import { Cart } from "@/modules/cart";
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

// ✅ Get all carts (with optional filters)
export const getAllCarts = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale = (req.locale as SupportedLocale) || "en";
    const { Cart } = await getTenantModels(req);
    try {
      const { userId, status, couponCode, isActive, language } = req.query;
      const filter: any = { tenant: req.tenant };

      if (userId) filter.user = userId;
      if (status && ["open", "ordered", "cancelled"].includes(status as string))
        filter.status = status;
      if (typeof isActive !== "undefined")
        filter.isActive = isActive === "true";
      if (couponCode) filter.couponCode = couponCode;
      if (language) filter.language = language;

      const carts = await Cart.find(filter)
        .populate("user", "name email")
        .populate("items.product", "name price stock")
        .sort({ createdAt: -1 });

      logger.withReq.info(req, cartT("cart.admin.fetchedAll", locale));
      res.status(200).json({
        success: true,
        data: carts,
        message: cartT("cart.admin.fetchedAll", locale),
      });
      return;
    } catch (error) {
      logger.withReq.error(
        req,
        cartT("cart.admin.fetchError", locale) + " " + String(error)
      );
      next(error);
    }
  }
);

// ✅ Get single cart by ID
export const getSingleCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale = (req.locale as SupportedLocale) || "en";
    const { Cart } = await getTenantModels(req);
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        logger.withReq.warn(req, cartT("cart.admin.invalidId", locale, { id }));
        res.status(400).json({
          success: false,
          message: cartT("cart.admin.invalidId", locale),
        });
        return;
      }
      const cart = await Cart.findOne({ _id: id, tenant: req.tenant }).populate(
        "items.product"
      );
      if (!cart) {
        logger.withReq.warn(req, cartT("cart.notFound", locale, { id }));
        res
          .status(404)
          .json({ success: false, message: cartT("cart.notFound", locale) });
        return;
      }
      logger.withReq.info(
        req,
        cartT("cart.admin.fetchedSingle", locale, { id })
      );
      res.status(200).json({
        success: true,
        data: cart,
        message: cartT("cart.admin.fetchedSingle", locale),
      });
      return;
    } catch (error) {
      logger.withReq.error(
        req,
        cartT("cart.admin.fetchSingleError", locale) + " " + String(error)
      );
      next(error);
    }
  }
);

// ✅ Update cart (admin)
export const updateCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale = (req.locale as SupportedLocale) || "en";
    const { Cart } = await getTenantModels(req);
    try {
      const { id } = req.params;
      const { items, status, couponCode, isActive } = req.body;

      if (!isValidObjectId(id)) {
        logger.withReq.warn(req, cartT("cart.admin.invalidId", locale, { id }));
        res.status(400).json({
          success: false,
          message: cartT("cart.admin.invalidId", locale),
        });
        return;
      }

      const cart = await Cart.findOne({ _id: id, tenant: req.tenant });
      if (!cart) {
        logger.withReq.warn(req, cartT("cart.notFound", locale, { id }));
        res
          .status(404)
          .json({ success: false, message: cartT("cart.notFound", locale) });
        return;
      }

      if (items && Array.isArray(items)) {
        cart.items = items;
        cart.totalPrice = items.reduce(
          (total: number, item: ICartItem) =>
            total + item.quantity * item.priceAtAddition,
          0
        );
      }

      if (status) {
        if (!["open", "ordered", "cancelled"].includes(status)) {
          logger.withReq.warn(
            req,
            cartT("cart.admin.invalidStatus", locale, { status })
          );
          res.status(400).json({
            success: false,
            message: cartT("cart.admin.invalidStatus", locale),
          });
          return;
        }
        cart.status = status;
      }

      if (typeof isActive === "boolean") cart.isActive = isActive;
      if (couponCode !== undefined) cart.couponCode = couponCode;

      await cart.save();

      logger.withReq.info(req, cartT("cart.admin.updated", locale, { id }));
      res.status(200).json({
        success: true,
        message: cartT("cart.admin.updated", locale),
        data: cart,
      });
      return;
    } catch (error) {
      logger.withReq.error(
        req,
        cartT("cart.admin.updateError", locale) + " " + String(error)
      );
      next(error);
    }
  }
);

// ✅ Delete cart
export const deleteCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale = (req.locale as SupportedLocale) || "en";
    const { Cart } = await getTenantModels(req);
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        logger.withReq.warn(req, cartT("cart.admin.invalidId", locale, { id }));
        res.status(400).json({
          success: false,
          message: cartT("cart.admin.invalidId", locale),
        });
        return;
      }
      const cart = await Cart.findOne({ _id: id, tenant: req.tenant });
      if (!cart) {
        logger.withReq.warn(req, cartT("cart.notFound", locale, { id }));
        res
          .status(404)
          .json({ success: false, message: cartT("cart.notFound", locale) });
        return;
      }
      await cart.deleteOne();

      logger.withReq.info(req, cartT("cart.admin.deleted", locale, { id }));
      res.status(200).json({
        success: true,
        message: cartT("cart.admin.deleted", locale),
      });
      return;
    } catch (error) {
      logger.withReq.error(
        req,
        cartT("cart.admin.deleteError", locale) + " " + String(error)
      );
      next(error);
    }
  }
);

// ✅ Toggle cart active status
export const toggleCartActiveStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locale = (req.locale as SupportedLocale) || "en";
    const { Cart } = await getTenantModels(req);
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        logger.withReq.warn(req, cartT("cart.admin.invalidId", locale, { id }));
        res.status(400).json({
          success: false,
          message: cartT("cart.admin.invalidId", locale),
        });
        return;
      }

      const cart = await Cart.findOne({ _id: id, tenant: req.tenant });
      if (!cart) {
        logger.withReq.warn(req, cartT("cart.notFound", locale, { id }));
        res
          .status(404)
          .json({ success: false, message: cartT("cart.notFound", locale) });
        return;
      }

      cart.isActive = !cart.isActive;
      await cart.save();

      const msgKey = cart.isActive
        ? "cart.admin.activated"
        : "cart.admin.deactivated";
      logger.withReq.info(req, cartT(msgKey, locale, { id }));

      res.status(200).json({
        success: true,
        message: cartT(msgKey, locale),
        isActive: cart.isActive,
      });
      return;
    } catch (error) {
      logger.withReq.error(
        req,
        cartT("cart.admin.toggleActiveError", locale) + " " + String(error)
      );
      next(error);
    }
  }
);
