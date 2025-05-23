// @/modules/booking/admin.controller.ts
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Booking } from "@/modules/booking";
import { isValidObjectId } from "@/core/utils/validation";

export const getAllBookings = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { language } = req.query;
  const filter = language ? { language: { $eq: language } } : {};

  const bookings = await Booking.find(filter)
    .populate("service")
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: bookings,
  });
});

export const getBookingById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid booking ID." });
    return;
  }

  const booking = await Booking.findById(id).populate("service");
  if (!booking) {
    res.status(404).json({ message: "Booking not found." });
    return;
  }

  res.status(200).json({ success: true, data: booking });
});

export const updateBookingStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid booking ID." });
    return;
  }

  const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true });

  if (!booking) {
    res.status(404).json({ message: "Booking not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Booking status updated successfully.",
    booking,
  });
});

export const deleteBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid booking ID." });
    return;
  }

  const booking = await Booking.findByIdAndDelete(id);
  if (!booking) {
    res.status(404).json({ message: "Booking not found or already deleted." });
    return;
  }

  res.status(200).json({ success: true, message: "Booking deleted successfully." });
});
