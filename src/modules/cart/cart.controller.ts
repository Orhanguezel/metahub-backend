import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Cart } from "@/modules/cart";
import { ICartItem } from "@/modules/cart/types";
import { RadonarProd, radonarprodTypes } from "@/modules/radonarprod"; 
import { IRadonarProd } from "@/modules/radonarprod/types";

// Helper to recalculate total
const recalculateTotal = (items: ICartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.priceAtAddition, 0);


const getProduct = async (productId: string): Promise<radonarprodTypes.IRadonarProd | null> =>
  RadonarProd.findById(productId);

// Helper to get user's cart
const getCartForUser = async (userId: string, populate = false) => {
  return populate
    ? Cart.findOne({ user: userId }).populate("items.product")
    : Cart.findOne({ user: userId });
};

// ✅ Get user's cart
export const getUserCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({ success: false, message: "User ID is required." });
        return;
      }

      let cart = await getCartForUser(userId, true);

      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [],
          totalPrice: 0,
          couponCode: null,
          language: req.locale || "en",
        });
        await cart.save();

        res.status(201).json({
          success: true,
          message: "Cart created successfully.",
          cart,
        });
        return;
      }

      cart.totalPrice = recalculateTotal(cart.items);
      await cart.save();

      res.status(200).json({
        success: true,
        data: cart,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Add item to cart
export const addToCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { productId, quantity } = req.body;

      if (!userId || !productId || quantity <= 0) {
        res.status(400).json({ success: false, message: "Invalid product or quantity." });
        return;
      }

      // --- RADONAR PRODUCT ---
      const product = await getProduct(productId);
      if (!product) {
        res.status(404).json({ success: false, message: "Product not found." });
        return;
      }

      if (product.stock < quantity) {
        res.status(400).json({
          success: false,
          message: `Only ${product.stock} items in stock.`,
        });
        return;
      }

      let cart = await getCartForUser(userId);
      if (!cart) {
        cart = new Cart({
          user: userId,
          items: [],
          totalPrice: 0,
          couponCode: null,
          language: req.locale || "en",
        });
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
        cart.items[itemIndex].totalPriceAtAddition =
          cart.items[itemIndex].quantity *
          cart.items[itemIndex].priceAtAddition;
      } else {
        cart.items.push({
          product: new Types.ObjectId(productId),
          quantity,
          priceAtAddition: product.price,
          totalPriceAtAddition: quantity * product.price,
        });
      }

      cart.totalPrice = recalculateTotal(cart.items);
      await cart.save();

      const isCritical =
        product.stock - quantity <= (product.stockThreshold || 5);
      const warning = isCritical ? "⚠️ Stock level is critical!" : undefined;

      res.status(201).json({
        success: true,
        message: "Product added to cart.",
        cart,
        warning,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// --- Increase, Decrease, Remove, Clear işlemlerinde de product yerine RadonarProd kullanılacak ---

// ✅ Increase item quantity
export const increaseQuantity = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId || !productId) {
        res.status(400).json({
          success: false,
          message: "User ID and Product ID are required.",
        });
        return;
      }

      const cart = await getCartForUser(userId, true);
      if (!cart) {
        res.status(404).json({ success: false, message: "Cart not found." });
        return;
      }

      const itemIndex = cart.items.findIndex(
        (item) => (item.product as any)._id?.toString() === productId
      );
      if (itemIndex === -1) {
        res.status(404).json({ success: false, message: "Item not found in cart." });
        return;
      }

      // RADONAR PRODUCT
      const product = await getProduct(productId);
      if (!product) {
        res.status(404).json({ success: false, message: "Product not found." });
        return;
      }

      if (cart.items[itemIndex].quantity >= product.stock) {
        res.status(400).json({ success: false, message: "Stock limit reached." });
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
      const warning = isCritical ? "⚠️ Stock level is critical!" : undefined;

      res.status(200).json({
        success: true,
        message: "Quantity increased.",
        cart,
        warning,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Decrease item quantity
export const decreaseQuantity = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId || !productId) {
        res.status(400).json({
          success: false,
          message: "User ID and Product ID are required.",
        });
        return;
      }

      const cart = await getCartForUser(userId, true);
      if (!cart) {
        res.status(404).json({ success: false, message: "Cart not found." });
        return;
      }

      const itemIndex = cart.items.findIndex(
        (item) => (item.product as any)._id?.toString() === productId
      );
      if (itemIndex === -1) {
        res.status(404).json({ success: false, message: "Item not found in cart." });
        return;
      }

      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
        cart.items[itemIndex].totalPriceAtAddition =
          cart.items[itemIndex].quantity *
          cart.items[itemIndex].priceAtAddition;
      } else {
        cart.items.splice(itemIndex, 1);
      }

      cart.totalPrice = recalculateTotal(cart.items);
      await cart.save();

      res.status(200).json({
        success: true,
        message: "Quantity decreased.",
        cart,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Remove item from cart
export const removeFromCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;

      if (!userId || !productId) {
        res.status(400).json({
          success: false,
          message: "User ID and Product ID are required.",
        });
        return;
      }

      const cart = await getCartForUser(userId, true);
      if (!cart) {
        res.status(404).json({ success: false, message: "Cart not found." });
        return;
      }

      const itemIndex = cart.items.findIndex(
        (item) => (item.product as any)._id?.toString() === productId
      );
      if (itemIndex === -1) {
        res.status(404).json({ success: false, message: "Item not found in cart." });
        return;
      }

      cart.items.splice(itemIndex, 1);
      cart.totalPrice = recalculateTotal(cart.items);
      await cart.save();

      res.status(200).json({
        success: true,
        message: "Item removed from cart.",
        cart,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Clear cart
export const clearCart = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      const cart = await getCartForUser(userId!, true);
      if (!cart) {
        res.status(404).json({ success: false, message: "Cart not found." });
        return;
      }

      if (!cart.items.length) {
        res.status(400).json({ success: false, message: "Cart is already empty." });
        return;
      }

      cart.items = [];
      cart.totalPrice = 0;
      await cart.save();

      res.status(200).json({
        success: true,
        message: "Cart cleared successfully.",
        cart,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);
