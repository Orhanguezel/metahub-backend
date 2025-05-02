import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Customer } from "@/modules/customer";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get all customers
export const getAllCustomers = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Customers fetched successfully.",
      data: customers,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Get customer by ID
export const getCustomerById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      res.status(404).json({ success: false, message: "Customer not found." });
      return;
    }
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Create customer
export const createCustomer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyName, contactName, email, phone, address } = req.body;

    const customer = await Customer.create({ companyName, contactName, email, phone, address });
    res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Update customer
export const updateCustomer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updated) {
      res.status(404).json({ success: false, message: "Customer not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Delete customer
export const deleteCustomer = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);

    if (!deleted) {
      res.status(404).json({ success: false, message: "Customer not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
});
