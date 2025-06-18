import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
//import { Booking } from "@/modules/booking";
import { isValidObjectId } from "@/core/utils/validation";
import { BookingConfirmedTemplate } from "@/modules/booking/templates/bookingConfirmation";
import { BookingRejectionTemplate } from "@/modules/booking/templates/bookingRejection";
import { sendEmail } from "@/services/emailService";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/templates/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// Çok dilli çeviri fonksiyonu (user response veya log için kullanılabilir)
function bookingT(
  key: string,
  vars?: Record<string, any>,
  locale?: SupportedLocale
) {
  return t(key, locale || getLogLocale(), translations, vars);
}

export const getAllBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const { language } = req.query;
    const userLocale = req.locale as SupportedLocale | undefined; // setLocale middleware varsa

    const filter = language
      ? { language: { $eq: language } }
      : { tenant: req.tenant };

    const { Booking } = await getTenantModels(req);
    const bookings = await Booking.find(filter)
      .populate("service")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    // Log mesajı log locale ile
    logger.info(bookingT("admin.bookings.fetched", undefined, getLogLocale()));

    // Response mesajı user locale ile
    res.status(200).json({
      success: true,
      data: bookings,
      message: bookingT("admin.bookings.fetched", undefined, userLocale),
    });
  }
);

export const getBookingById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userLocale = req.locale as SupportedLocale | undefined;

    if (!isValidObjectId(id)) {
      logger.warn(bookingT("admin.bookings.invalidId", { id }, getLogLocale()));
      res.status(400).json({
        success: false,
        message: bookingT("admin.bookings.invalidId", { id }, userLocale),
      });
      return;
    }
    const { Booking } = await getTenantModels(req);
    const booking = await Booking.findOne({
      _id: id,
      tenant: req.tenant,
    }).populate("service");
    if (!booking) {
      logger.warn(bookingT("admin.bookings.notFound", { id }, getLogLocale()));
      res.status(404).json({
        success: false,
        message: bookingT("admin.bookings.notFound", { id }, userLocale),
      });
      return;
    }

    logger.info(bookingT("admin.bookings.fetchedOne", { id }, getLogLocale()));
    res.status(200).json({
      success: true,
      data: booking,
      message: bookingT("admin.bookings.fetchedOne", { id }, userLocale),
    });
  }
);

export const updateBookingStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const userLocale = req.locale as SupportedLocale | undefined;

    if (!isValidObjectId(id)) {
      logger.warn(bookingT("admin.bookings.invalidId", { id }, getLogLocale()));
      res.status(400).json({
        success: false,
        message: bookingT("admin.bookings.invalidId", { id }, userLocale),
      });
      return;
    }

    const { Booking } = await getTenantModels(req);
    const booking = await Booking.findByIdAndUpdate(
      id,
      { tenant: req.tenant, status },
      { new: true }
    );
    if (!booking) {
      logger.warn(bookingT("admin.bookings.notFound", { id }, getLogLocale()));
      res.status(404).json({
        success: false,
        message: bookingT("admin.bookings.notFound", { id }, userLocale),
      });
      return;
    }

    // E-posta gönderimi: confirmed/cancelled için
    if (status === "confirmed") {
      try {
        await sendEmail({
          to: booking.email,
          subject: bookingT("booking.confirmed.subject", undefined, userLocale),
          html: BookingConfirmedTemplate({
            name: booking.name,
            service: booking.serviceType,
            date: booking.date,
            time: booking.time,
          }),
        });
        logger.info(
          bookingT("booking.confirmed.emailSent", { id }, getLogLocale())
        );
      } catch (err) {
        logger.error(
          bookingT("booking.confirmed.emailError", { id }, getLogLocale()) +
            " " +
            String(err)
        );
      }
    }
    if (status === "cancelled") {
      try {
        await sendEmail({
          to: booking.email,
          subject: bookingT("booking.rejected.subject", undefined, userLocale),
          html: BookingRejectionTemplate({
            name: booking.name,
            service: booking.serviceType,
            date: booking.date,
            time: booking.time,
          }),
        });
        logger.info(
          bookingT("booking.rejected.emailSent", { id }, getLogLocale())
        );
      } catch (err) {
        logger.error(
          bookingT("booking.rejected.emailError", { id }, getLogLocale()) +
            " " +
            String(err)
        );
      }
    }

    logger.info(
      bookingT("admin.bookings.statusUpdated", { id, status }, getLogLocale())
    );
    res.status(200).json({
      success: true,
      message: bookingT(
        "admin.bookings.statusUpdated",
        { id, status },
        userLocale
      ),
      booking,
    });
  }
);

export const deleteBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userLocale = req.locale as SupportedLocale | undefined;

    if (!isValidObjectId(id)) {
      logger.warn(bookingT("admin.bookings.invalidId", { id }, getLogLocale()));
      res.status(400).json({
        success: false,
        message: bookingT("admin.bookings.invalidId", { id }, userLocale),
      });
      return;
    }

    const { Booking } = await getTenantModels(req);
    const booking = await Booking.deleteOne({ _id: id, tenant: req.tenant });
    if (!booking) {
      logger.warn(
        bookingT("admin.bookings.notFoundOrDeleted", { id }, getLogLocale())
      );
      res.status(404).json({
        success: false,
        message: bookingT(
          "admin.bookings.notFoundOrDeleted",
          { id },
          userLocale
        ),
      });
      return;
    }

    logger.info(bookingT("admin.bookings.deleted", { id }, getLogLocale()));
    res.status(200).json({
      success: true,
      message: bookingT("admin.bookings.deleted", { id }, userLocale),
    });
  }
);
