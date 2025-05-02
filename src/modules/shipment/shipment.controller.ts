import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Shipment } from "@/modules/shipment";
import { Order } from "@/modules/order";

// ➕ Create shipment
export const addShipment = asyncHandler(async (req: Request, res: Response) => {
  const {
    order,
    trackingNumber,
    status,
    estimatedDelivery,
    carrier,
    carrierDetails,
    recipientName,
    deliveryType,
  } = req.body;

  const existingOrder = await Order.findById(order);
  if (!existingOrder) {
    res.status(400);
    throw new Error("Invalid order ID.");
  }

  const newShipment = await Shipment.create({
    order,
    trackingNumber,
    status,
    estimatedDelivery,
    carrier,
    carrierDetails,
    recipientName,
    deliveryType,
  });

  res.status(201).json({
    success: true,
    message: "Shipment created successfully.",
    data: newShipment,
  });
});

// 📦 Get all shipments
export const getShipments = asyncHandler(async (_req: Request, res: Response) => {
  const shipments = await Shipment.find().populate("order", "totalPrice status createdAt");
  res.status(200).json({
    success: true,
    message: "All shipments fetched successfully.",
    data: shipments,
  });
});

// 📦 Get single shipment
export const getShipmentById = asyncHandler(async (req: Request, res: Response) => {
  const shipment = await Shipment.findById(req.params.id).populate("order", "totalPrice status createdAt");

  if (!shipment) {
    res.status(404);
    throw new Error("Shipment not found.");
  }

  res.status(200).json({
    success: true,
    message: "Shipment fetched successfully.",
    data: shipment,
  });
});

// ✏️ Update shipment
export const updateShipment = asyncHandler(async (req: Request, res: Response) => {
  const updated = await Shipment.findByIdAndUpdate(req.params.id, req.body, { new: true });

  if (!updated) {
    res.status(404);
    throw new Error("Shipment not found.");
  }

  res.status(200).json({
    success: true,
    message: "Shipment updated successfully.",
    data: updated,
  });
});

// ❌ Delete shipment
export const deleteShipment = asyncHandler(async (req: Request, res: Response) => {
  const shipment = await Shipment.findByIdAndDelete(req.params.id);

  if (!shipment) {
    res.status(404);
    throw new Error("Shipment not found.");
  }

  res.status(200).json({
    success: true,
    message: "Shipment deleted successfully.",
  });
});
