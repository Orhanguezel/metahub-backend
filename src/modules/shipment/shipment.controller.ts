import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Shipment } from "@/modules/shipment";
//import { Order } from "@/modules/order";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ➕ Create shipment
export const addShipment = asyncHandler(async (req: Request, res: Response) => {
  const { Shipment, Order } = await getTenantModels(req);
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

  const existingOrder = await Order.findOne({ _id: order, tenant: req.tenant });
  if (!existingOrder) {
    res.status(400);
    throw new Error("Invalid order ID.");
  }

  const newShipment = await Shipment.create({
    order,
    tenant: req.tenant,
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
export const getShipments = asyncHandler(
  async (req: Request, res: Response) => {
    const { Shipment } = await getTenantModels(req);
    const shipments = await Shipment.find({ tenant: req.tenant }).populate(
      "order",
      "totalPrice status createdAt"
    );
    res.status(200).json({
      success: true,
      message: "All shipments fetched successfully.",
      data: shipments,
    });
  }
);

// 📦 Get single shipment
export const getShipmentById = asyncHandler(
  async (req: Request, res: Response) => {
    const { Shipment } = await getTenantModels(req);
    const shipment = await Shipment.findOne({ tenant: req.tenant }).populate(
      "order",
      "totalPrice status createdAt"
    );

    if (!shipment) {
      res.status(404);
      throw new Error("Shipment not found.");
    }

    res.status(200).json({
      success: true,
      message: "Shipment fetched successfully.",
      data: shipment,
    });
  }
);

// ✏️ Update shipment
export const updateShipment = asyncHandler(
  async (req: Request, res: Response) => {
    const { Shipment } = await getTenantModels(req);
    const updated = await Shipment.findByIdAndUpdate(
      req.params.id,
      { tenant: req.tenant, ...req.body },
      {
        new: true,
      }
    );

    if (!updated) {
      res.status(404);
      throw new Error("Shipment not found.");
    }

    res.status(200).json({
      success: true,
      message: "Shipment updated successfully.",
      data: updated,
    });
  }
);

// ❌ Delete shipment
export const deleteShipment = asyncHandler(
  async (req: Request, res: Response) => {
    const { Shipment } = await getTenantModels(req);
    const shipment = await Shipment.findByIdAndDelete(req.params.id, {
      tenant: req.tenant,
    });

    if (!shipment) {
      res.status(404);
      throw new Error("Shipment not found.");
    }

    res.status(200).json({
      success: true,
      message: "Shipment deleted successfully.",
    });
  }
);
