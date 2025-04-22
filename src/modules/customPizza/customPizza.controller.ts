import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import CustomPizza from "./customPizza.models";
import { isValidObjectId } from "../../core/utils/validation";

// 🔸 Create custom pizza
export const createCustomPizza = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    size,
    base,
    sauce,
    toppings,
    extras = [],
    note,
    totalPrice,
    order,
  } = req.body;

  if (!size || !base || !sauce || !toppings || !totalPrice) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Pflichtfelder fehlen."
          : req.locale === "tr"
          ? "Gerekli alanlar eksik."
          : "Missing required fields.",
    });
    return;
  }

  const customPizza = await CustomPizza.create({
    size,
    base,
    sauce,
    toppings,
    extras,
    note,
    totalPrice,
    user: req.user?.id || null,
    order,
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Pizza erfolgreich erstellt."
        : req.locale === "tr"
        ? "Pizza başarıyla oluşturuldu."
        : "Pizza created successfully.",
    pizza: customPizza,
  });
});

// 🔸 Get all custom pizzas
export const getAllCustomPizzas = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const pizzas = await CustomPizza.find()
    .populate("user", "name email")
    .populate("order")
    .sort({ createdAt: -1 });

  res.status(200).json(pizzas);
});

// 🔸 Get custom pizza by ID
export const getCustomPizzaById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Ungültige Pizza-ID."
          : req.locale === "tr"
          ? "Geçersiz pizza ID'si."
          : "Invalid pizza ID.",
    });
    return;
  }

  const pizza = await CustomPizza.findById(id)
    .populate("user", "name email")
    .populate("order");

  if (!pizza) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Pizza wurde nicht gefunden."
          : req.locale === "tr"
          ? "Pizza bulunamadı."
          : "Pizza not found.",
    });
    return;
  }

  res.status(200).json(pizza);
});

// 🔸 Delete custom pizza
export const deleteCustomPizza = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Ungültige Pizza-ID."
          : req.locale === "tr"
          ? "Geçersiz pizza ID'si."
          : "Invalid pizza ID.",
    });
    return;
  }

  const pizza = await CustomPizza.findByIdAndDelete(id);
  if (!pizza) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Pizza wurde nicht gefunden oder bereits gelöscht."
          : req.locale === "tr"
          ? "Pizza bulunamadı veya zaten silinmiş."
          : "Pizza not found or already deleted.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Pizza erfolgreich gelöscht."
        : req.locale === "tr"
        ? "Pizza başarıyla silindi."
        : "Pizza deleted successfully.",
  });
});
