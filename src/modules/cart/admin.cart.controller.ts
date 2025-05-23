import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "@/core/utils/validation";
import { Cart} from "@/modules/cart";
import { ICartItem } from "@/modules/cart/cart.models";

// ✅ Get all carts (with optional filters)
export const getAllCarts = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, status, couponCode, isActive, language } = req.query;
    const filter: any = {};

    if (userId) {
      filter.user = userId;
    }

    if (status && ["open", "ordered", "cancelled"].includes(status as string)) {
      filter.status = status;
    }

    if (typeof isActive !== "undefined") {
      filter.isActive = isActive === "true";
    }

    if (couponCode) {
      filter.couponCode = couponCode;
    }

    if (language) {
      filter.language = language;
    }

    const carts = await Cart.find(filter)
      .populate("user", "name email")
      .populate("items.product", "name price stock")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: carts,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Get single cart by ID
export const getSingleCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid cart ID." });
      return;
    }

    const cart = await Cart.findById(id).populate("items.product");

    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Update cart (admin)
export const updateCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { items, status, couponCode, isActive } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid cart ID." });
      return;
    }

    const cart = await Cart.findById(id);
    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found." });
      return;
    }

    if (items && Array.isArray(items)) {
      cart.items = items;
      cart.totalPrice = items.reduce(
        (total: number, item: ICartItem) => total + item.quantity * item.priceAtAddition,
        0
      );
    }

    if (status) {
      if (!["open", "ordered", "cancelled"].includes(status)) {
        res.status(400).json({ success: false, message: "Invalid cart status." });
        return;
      }
      cart.status = status;
    }

    if (typeof isActive === "boolean") {
      cart.isActive = isActive;
    }

    if (couponCode !== undefined) {
      cart.couponCode = couponCode;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated successfully.",
      data: cart,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Delete cart
export const deleteCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid cart ID." });
      return;
    }

    const cart = await Cart.findById(id);

    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found." });
      return;
    }

    await cart.deleteOne();

    res.status(200).json({
      success: true,
      message: "Cart deleted successfully.",
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Toggle cart active status
export const toggleCartActiveStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid cart ID." });
      return;
    }

    const cart = await Cart.findById(id);
    if (!cart) {
      res.status(404).json({ success: false, message: "Cart not found." });
      return;
    }

    cart.isActive = !cart.isActive;
    await cart.save();

    res.status(200).json({
      success: true,
      message: cart.isActive ? "Cart activated." : "Cart deactivated.",
      isActive: cart.isActive,
    });
    return;
  } catch (error) {
    next(error);
  }
});
