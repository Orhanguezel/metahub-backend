import asyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import Cart, { ICartItem } from "./cart.models";
import { Product, IProduct } from "../product";
import { Types } from "mongoose";

const recalculateTotal = (items: ICartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.priceAtAddition, 0);

const getProduct = async (productId: string): Promise<IProduct | null> =>
  Product.findById(productId);

const getCartForUser = async (userId: string, populate = false) => {
  return populate
    ? Cart.findOne({ user: userId }).populate("items.product")
    : Cart.findOne({ user: userId });
};

// ✅ Sepeti getir
export const getUserCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json({ message: "User ID is required." });
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
      res.status(201).json(cart);
      return;
    }

    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();
    res.status(200).json(cart);
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Sepete ürün ekle
export const addToCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    if (!userId || !productId || quantity <= 0) {
      res.status(400).json({ message: "Invalid product or quantity." });
      return;
    }

    const product = await getProduct(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({ message: `Only ${product.stock} items in stock.` });
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

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].totalPriceAtAddition = cart.items[itemIndex].quantity * cart.items[itemIndex].priceAtAddition;
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

    const isCritical = product.stock - quantity <= (product.stockThreshold || 5);
    const warning = isCritical ? "⚠️ Stock level is critical!" : undefined;

    res.status(201).json({
      message: "Added to cart.",
      cart,
      warning,
    });
    return;
  } catch (error) {
    next(error);
  }
});


// ✅ Sepet ürünü adedini artır
export const increaseQuantity = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId || !productId) {
      res.status(400).json({ message: "User ID and Product ID are required." });
      return;
    }

    const cart = await getCartForUser(userId, true);
    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
      return;
    }

    const itemIndex = cart.items.findIndex((item) => (item.product as any)._id?.toString() === productId);
    if (itemIndex === -1) {
      res.status(404).json({ message: "Item not found in cart." });
      return;
    }

    const product = await getProduct(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    if (cart.items[itemIndex].quantity >= product.stock) {
      res.status(400).json({ message: "Stock limit reached." });
      return;
    }

    cart.items[itemIndex].quantity += 1;
    cart.items[itemIndex].priceAtAddition = product.price;
    cart.items[itemIndex].totalPriceAtAddition = cart.items[itemIndex].quantity * product.price;

    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    const isCritical = product.stock - cart.items[itemIndex].quantity <= (product.stockThreshold || 5);
    const warning = isCritical ? "⚠️ Stock level is critical!" : undefined;

    res.status(200).json({
      message: "Quantity increased.",
      cart,
      warning,
    });
    return;
  } catch (error) {
    next(error);
  }
});


// ✅ Sepet ürünü adedini azalt
export const decreaseQuantity = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId || !productId) {
      res.status(400).json({ message: "User ID and Product ID are required." });
      return;
    }

    const cart = await getCartForUser(userId, true);
    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
      return;
    }

    const itemIndex = cart.items.findIndex((item) => (item.product as any)._id?.toString() === productId);
    if (itemIndex === -1) {
      res.status(404).json({ message: "Item not found in cart." });
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

    res.status(200).json({
      message: "Quantity decreased.",
      cart,
    });
    return;
  } catch (error) {
    next(error);
  }
});


// ✅ Sepetten ürünü tamamen kaldır
export const removeFromCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId || !productId) {
      res.status(400).json({ message: "User ID and Product ID are required." });
      return;
    }

    const cart = await getCartForUser(userId, true);
    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
      return;
    }

    const itemIndex = cart.items.findIndex((item) => (item.product as any)._id?.toString() === productId);
    if (itemIndex === -1) {
      res.status(404).json({ message: "Item not found in cart." });
      return;
    }

    cart.items.splice(itemIndex, 1);
    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    res.status(200).json({
      message: "Item removed from cart.",
      cart,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Sepeti temizle

export const clearCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    const cart = await getCartForUser(userId!, true);
    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
      return 
    }

    if (!cart.items.length) {
       res.status(400).json({ message: "Cart is already empty." });
       return
    }

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

     res.status(200).json({ message: "Cart cleared successfully.", cart });
      return;
  } catch (error) {
    next(error);
  }
  
});




// ✅ Admin: Kullanıcının sepetini sil
export const deleteCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Cart ID is required." });
      return;
    }

    const cart = await Cart.findById(id);

    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
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

// ✅ Admin: ID ile tek sepeti getir
export const getSingleCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: "Cart ID is required." });
      return;
    }

    const cart = await Cart.findById(id).populate("items.product");

    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
      return;
    }

    res.status(200).json(cart);
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Admin: Sepeti güncelle
export const updateCart = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { items, status, couponCode, isActive } = req.body;

    if (!id) {
      res.status(400).json({ message: "Cart ID is required." });
      return;
    }

    const cart = await Cart.findById(id);
    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
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
        res.status(400).json({ message: "Invalid cart status." });
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
      cart,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Admin: Tüm sepetleri filtreli getir
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

    res.status(200).json(carts);
    return;
  } catch (error) {
    next(error);
  }
});


// ✅ Admin: Sepeti aktif/pasif yap
export const toggleCartActiveStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const cart = await Cart.findById(id);
    if (!cart) {
      res.status(404).json({ message: "Cart not found." });
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









