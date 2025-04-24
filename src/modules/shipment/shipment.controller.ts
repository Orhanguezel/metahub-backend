import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Shipment from "./shipment.model";
import {Order} from "../order";

// ➕ Yeni kargo oluştur
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

  if (!trackingNumber) {
    res.status(400).json({ error: "Tracking number is required." });
    return;
  }

  const existingOrder = await Order.findById(order);
  if (!existingOrder) {
    res.status(400).json({ message: "Geçersiz sipariş ID." });
    return;
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

  res.status(201).json(newShipment);
});

// 📦 Tüm kargolar
export const getShipments = asyncHandler(async (_req: Request, res: Response) => {
  const shipments = await Shipment.find().populate("order", "totalPrice status createdAt");
  res.status(200).json(shipments);
});

// 📦 Tek kargo
export const getShipmentById = asyncHandler(async (req: Request, res: Response) => {
  const shipment = await Shipment.findById(req.params.id).populate("order", "totalPrice status createdAt");

  if (!shipment) {
    res.status(404).json({ message: "Kargo bulunamadı." });
    return;
  }

  res.status(200).json(shipment);
});

// ✏️ Kargo güncelle
export const updateShipment = asyncHandler(async (req: Request, res: Response) => {
  const {
    trackingNumber,
    status,
    estimatedDelivery,
    carrier,
    carrierDetails,
    recipientName,
    deliveryType,
  } = req.body;

  const updated = await Shipment.findByIdAndUpdate(
    req.params.id,
    {
      trackingNumber,
      status,
      estimatedDelivery,
      carrier,
      carrierDetails,
      recipientName,
      deliveryType,
    },
    { new: true }
  );

  if (!updated) {
    res.status(404).json({ message: "Kargo bulunamadı." });
    return;
  }

  res.status(200).json(updated);
});

// ❌ Kargo sil
export const deleteShipment = asyncHandler(async (req: Request, res: Response) => {
  const shipment = await Shipment.findByIdAndDelete(req.params.id);

  if (!shipment) {
    res.status(404).json({ message: "Kargo bulunamadı." });
    return;
  }

  res.status(200).json({ message: "Kargo başarıyla silindi." });
});
