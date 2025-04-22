import { Request, Response } from "express";
import { Types } from "mongoose";
import asyncHandler from "express-async-handler";
import Cart, { ICartItem } from "./cart.models";
import Product, { IProduct } from "../product/product.models";

// Toplam fiyatı hesapla
const recalculateTotal = (items: ICartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity * item.priceAtAddition, 0);

// Ürün getir
const getProduct = async (productId: string): Promise<IProduct | null> =>
  Product.findById(productId);

// Kullanıcının sepetini getir
const getCartForUser = async (userId: string, populate = false) => {
  return populate
    ? Cart.findOne({ user: userId }).populate("items.product")
    : Cart.findOne({ user: userId });
};

// ✅ Sepeti getir
export const getUserCart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Benutzer-ID erforderlich."
            : req.locale === "tr"
            ? "Kullanıcı kimliği gerekli."
            : "User ID is required.",
      });
      return;
    }

    let cart = await getCartForUser(userId, true);

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalPrice: 0,
        language: req.locale || "en",
      });
      await cart.save();
      res.status(201).json(cart);
      return;
    }

    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();
    res.status(200).json(cart);
  }
);

// ✅ Sepete ürün ekle
export const addToCart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;

    if (!userId || !productId || quantity <= 0) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültiges Produkt oder Menge."
            : req.locale === "tr"
            ? "Ürün veya miktar geçersiz."
            : "Invalid product or quantity.",
      });
      return;
    }

    const product = await getProduct(productId);
    if (!product) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Produkt nicht gefunden."
            : req.locale === "tr"
            ? "Ürün bulunamadı."
            : "Product not found.",
      });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? `Nur ${product.stock} Artikel auf Lager.`
            : req.locale === "tr"
            ? `Stokta sadece ${product.stock} adet ürün var.`
            : `Only ${product.stock} items in stock.`,
      });
      return;
    }

    let cart = await getCartForUser(userId);
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalPrice: 0,
        language: req.locale || "en",
      });
    }

    const index = cart.items.findIndex(
      (i) => i.product.toString() === productId
    );
    if (index > -1) {
      cart.items[index].quantity += quantity;
      cart.items[index].totalPriceAtAddition =
        cart.items[index].quantity * cart.items[index].priceAtAddition;
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
    const warning = isCritical
      ? req.locale === "de"
        ? "⚠️ Kritischer Lagerbestand!"
        : req.locale === "tr"
        ? "⚠️ Kritik stok seviyesi!"
        : "⚠️ Stock level is critical!"
      : undefined;

    res.status(201).json({ message: "Added to cart", cart, warning });
  }
);

// ✅ Ürün adedini artır
export const increaseQuantity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { productId } = req.params;

    const cart = await getCartForUser(userId!, true);
    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    const index = cart.items.findIndex(
      (item) => (item.product as any)._id?.toString() === productId
    );
    if (index === -1) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    const product = await getProduct(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    if (cart.items[index].quantity >= product.stock) {
      res.status(400).json({ message: "Stock limit reached" });
      return;
    }

    cart.items[index].quantity += 1;
    cart.items[index].priceAtAddition = product.price;
    cart.items[index].totalPriceAtAddition =
      cart.items[index].quantity * product.price;

    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    const isCritical =
      product.stock - cart.items[index].quantity <=
      (product.stockThreshold || 5);
    const warning = isCritical
      ? req.locale === "de"
        ? "⚠️ Kritischer Lagerbestand!"
        : req.locale === "tr"
        ? "⚠️ Kritik stok seviyesi!"
        : "⚠️ Stock level is critical!"
      : undefined;

    res.status(200).json({ message: "Quantity increased", cart, warning });
  }
);

// ✅ Ürün adedini azalt
export const decreaseQuantity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { productId } = req.params;

    const cart = await getCartForUser(userId!, true);
    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    const index = cart.items.findIndex(
      (item) => (item.product as any)._id?.toString() === productId
    );
    if (index === -1) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    if (cart.items[index].quantity > 1) {
      cart.items[index].quantity -= 1;
      cart.items[index].totalPriceAtAddition =
        cart.items[index].quantity * cart.items[index].priceAtAddition;
    } else {
      cart.items.splice(index, 1);
    }

    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    res.status(200).json({ message: "Quantity decreased", cart });
  }
);

// ✅ Ürünü sepetten çıkar
export const removeFromCart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { productId } = req.params;

    const cart = await getCartForUser(userId!, true);
    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    const index = cart.items.findIndex(
      (item) => (item.product as any)._id?.toString() === productId
    );
    if (index === -1) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    cart.items.splice(index, 1);
    cart.totalPrice = recalculateTotal(cart.items);
    await cart.save();

    res.status(200).json({ message: "Item removed", cart });
  }
);

// ✅ Sepeti temizle
export const clearCart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const cart = await getCartForUser(userId!);
    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    if (cart.items.length === 0) {
      res.status(400).json({ message: "Cart is already empty" });
      return;
    }

    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    res.status(200).json({ message: "Cart cleared", cart });
  }
);

// ✅ Admin: tüm sepetleri getir
export const getAllCarts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { lang } = req.query;
    const filter: any = {};
    if (lang) filter.language = lang;

    const carts = await Cart.find(filter).populate("items.product");
    res.status(200).json(carts);
  }
);
