// src/modules/custompizza/custompizza.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import {CustomPizza} from "../custompizza";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Custom Pizza
export const createCustomPizza = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { size, base, sauce, toppings, extras = [], note, totalPrice, order } = req.body;

    if (!size || !base || !sauce || !toppings || !totalPrice) {
      res.status(400).json({ success: false, message: "Missing required fields." });
      return;
    }

    const pizza = await CustomPizza.create({
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
      message: "Custom pizza created successfully.",
      data: pizza,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get All Custom Pizzas
export const getAllCustomPizzas = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pizzas = await CustomPizza.find()
      .populate("user", "name email")
      .populate("order")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: pizzas,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get Custom Pizza by ID
export const getCustomPizzaById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid pizza ID." });
      return;
    }

    const pizza = await CustomPizza.findById(id)
      .populate("user", "name email")
      .populate("order");

    if (!pizza) {
      res.status(404).json({ success: false, message: "Custom pizza not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: pizza,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Delete Custom Pizza
export const deleteCustomPizza = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid pizza ID." });
      return;
    }

    const pizza = await CustomPizza.findByIdAndDelete(id);

    if (!pizza) {
      res.status(404).json({ success: false, message: "Custom pizza not found or already deleted." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Custom pizza deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});
