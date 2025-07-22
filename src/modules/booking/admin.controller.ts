import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { BookingConfirmedTemplate } from "@/modules/booking/templates/bookingConfirmation";
import { BookingRejectionTemplate } from "@/modules/booking/templates/bookingRejection";
import { sendEmail } from "@/services/emailService";
import logger from "@/core/middleware/logger/logger";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

// Get all bookings (admin)
export const getAllBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const { language } = req.query;
    const locale = req.locale as SupportedLocale | undefined;
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    const filter: any = { tenant: req.tenant };
    if (language) filter.language = language;

    const { Booking } = await getTenantModels(req);
    const bookings = await Booking.find(filter)
      .populate("service")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    logger.withReq.info(
      req,
      t("admin.bookings.fetched", getRequestContext(req))
    );
    res.status(200).json({
      success: true,
      data: bookings,
      message: t("admin.bookings.fetched"),
    });
  }
);

// Get single booking (admin)
export const getBookingById = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale = req.locale as SupportedLocale | undefined;
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("admin.bookings.invalidId", { id }));
      res.status(400).json({
        success: false,
        message: t("admin.bookings.invalidId", { id }),
      });
      return;
    }
    const { Booking } = await getTenantModels(req);
    const booking = await Booking.findOne({
      _id: id,
      tenant: req.tenant,
    }).populate("service");
    if (!booking) {
      logger.withReq.warn(req, t("admin.bookings.notFound", { id }));
      res.status(404).json({
        success: false,
        message: t("admin.bookings.notFound", { id }),
      });
      return;
    }

    logger.withReq.info(req, t("admin.bookings.fetchedOne", { id }));
    res.status(200).json({
      success: true,
      data: booking,
      message: t("admin.bookings.fetchedOne", { id }),
    });
  }
);

// Update booking status (admin)
export const updateBookingStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const locale = req.locale as SupportedLocale | undefined;
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("admin.bookings.invalidId", { id }));
      res.status(400).json({
        success: false,
        message: t("admin.bookings.invalidId", { id }),
      });
      return;
    }

    const { Booking } = await getTenantModels(req);
    const booking = await Booking.findOneAndUpdate(
      { _id: id, tenant: req.tenant },
      { status },
      { new: true }
    );
    if (!booking) {
      logger.withReq.warn(req, t("admin.bookings.notFound", { id }));
      res.status(404).json({
        success: false,
        message: t("admin.bookings.notFound", { id }),
      });
      return;
    }

    // -------------- ✨ EN KRİTİK KISIM: TENANT DATA VE DİL -------------- //
    const tenantData = req.tenantData; // resolveTenant’dan
    const bookingLang = booking.language || locale || "en";
    const brandName =
      (tenantData?.name?.[bookingLang] ||
        tenantData?.name?.en ||
        tenantData?.name) ??
      "Brand";
    const senderEmail =
      tenantData?.emailSettings?.senderEmail;
    // ------------------------------------------------------------- //

    // -- Email gönderimi tenant-aware! --
    if (status === "confirmed") {
      try {
        await sendEmail({
          tenantSlug: req.tenant, // EN KRİTİK!
          to: booking.email,
          subject: t("booking.confirmed.subject"),
          html: BookingConfirmedTemplate({
            name: booking.name,
            service: booking.serviceType,
            date: booking.date,
            time: booking.time,
            locale: bookingLang,
            brandName,
            senderEmail,
          }),
        });

        logger.withReq.info(req, t("booking.confirmed.emailSent", { id }));
      } catch (err) {
        logger.withReq.error(req,
          t("booking.confirmed.emailError", { id }) + " " + String(err)
        );
      }
    }
    if (status === "cancelled") {
      try {
        await sendEmail({
          tenantSlug: req.tenant,
          to: booking.email,
          subject: t("booking.rejected.subject"),
          html: BookingRejectionTemplate({
            name: booking.name,
            service: booking.serviceType,
            date: booking.date,
            time: booking.time,
            locale: bookingLang,
            brandName,
            senderEmail,
          }),
        });

        logger.withReq.info(req, t("booking.rejected.emailSent", { id }));
      } catch (err) {
        logger.withReq.error(req, t("booking.rejected.emailError", { id }) + " " + String(err));
      }
    }

    logger.withReq.info(req, t("admin.bookings.statusUpdated", { id, status }));
    res.status(200).json({
      success: true,
      message: t("admin.bookings.statusUpdated", { id, status }),
      booking,
    });
  }
);

// Delete booking (admin)
export const deleteBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const locale = req.locale as SupportedLocale | undefined;
    const t = (key: string, params?: any) =>
      translate(key, locale, translations, params);

    if (!isValidObjectId(id)) {
      logger.withReq.warn(req, t("admin.bookings.invalidId", { id }));
      res.status(400).json({
        success: false,
        message: t("admin.bookings.invalidId", { id }),
      });
      return;
    }

    const { Booking } = await getTenantModels(req);
    const result = await Booking.deleteOne({ _id: id, tenant: req.tenant });
    if (!result.deletedCount) {
      logger.withReq.warn(req, t("admin.bookings.notFoundOrDeleted", { id }));
      res.status(404).json({
        success: false,
        message: t("admin.bookings.notFoundOrDeleted", { id }),
      });
      return;
    }

    logger.withReq.info(req, t("admin.bookings.deleted", { id }));
    res.status(200).json({
      success: true,
      message: t("admin.bookings.deleted", { id }),
    });
  }
);
