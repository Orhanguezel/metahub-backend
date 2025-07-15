import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/modules/i18n";
import type { SupportedLocale } from "@/types/common";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// --- 0️⃣ Tüm SectionSettings (admin, tüm tenantlardan) ---
export const getAllSectionSettingsAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { SectionSetting } = await getTenantModels(req);
    const all = await SectionSetting.find({}).sort({ order: 1 });
    res.json({
      success: true,
      message: t(
        "admin.section.settingsFetchedAll",
        req.locale || "en",
        translations
      ),
      data: all,
    });
  }
);

// --- 1️⃣ Create SectionSetting (tenant override) ---
export const createSectionSetting = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant; // SADECE BURADAN!
    const data = req.body;

    if (!tenant || !data.sectionKey) {
      res.status(400).json({
        success: false,
        message: t(
          "admin.module.tenantAndSectionKeyRequired",
          locale,
          translations
        ),
      });
      return;
    }

    const { SectionSetting } = await getTenantModels(req);

    const exists = await SectionSetting.findOne({
      tenant,
      sectionKey: data.sectionKey,
    });
    if (exists) {
      res.status(409).json({
        success: false,
        message: t("admin.section.settingExists", locale, translations, {
          sectionKey: data.sectionKey,
        }),
      });
      return;
    }

    if (data.label) data.label = fillAllLocales(data.label);
    if (data.description) data.description = fillAllLocales(data.description);

    const created = await SectionSetting.create({
      ...data,
      tenant,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.withReq.info(req,
      `[SectionSetting] Created: ${data.sectionKey} (${tenant})`,
      { module: "sectionSetting", tenant, sectionKey: data.sectionKey }
    );

    res.status(201).json({
      success: true,
      message: t("admin.section.settingCreated", locale, translations, {
        sectionKey: data.sectionKey,
      }),
      data: created,
    });
  }
);

// --- 2️⃣ Get all SectionSettings for CURRENT tenant ---
export const getSectionSettingsByTenant = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant; // YİNE SADECE BURADAN!
    const { SectionSetting } = await getTenantModels(req);

    if (!tenant) {
      res.status(400).json({
        success: false,
        message: t("admin.module.tenantRequired", locale, translations),
      });
      return;
    }

    const settings = await SectionSetting.find({ tenant, enabled: true }).sort({
      order: 1,
    });
    res.json({
      success: true,
      message: t("admin.section.settingsFetched", locale, translations, {
        tenant,
      }),
      data: settings,
    });
  }
);

// --- 3️⃣ Update SectionSetting ---
export const updateSectionSetting = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant;
    const { sectionKey } = req.params;
    const updates = req.body;
    const { SectionSetting } = await getTenantModels(req);

    if (!tenant || !sectionKey) {
      res.status(400).json({
        success: false,
        message: t(
          "admin.module.tenantAndSectionKeyRequired",
          locale,
          translations
        ),
      });
      return;
    }

    const allowedFields = [
      "enabled",
      "order",
      "label",
      "description",
      "params",
      "roles",
      "variant",
    ];
    const updateObj: Record<string, any> = {};
    const unsetObj: Record<string, ""> = {};

    // --- Label & Description: override edilmek istenmiyorsa unset!
    for (const key of allowedFields) {
      if (["label", "description"].includes(key)) {
        // Eğer hiç göndermediyse (override yok), dokunma!
        if (!(key in updates)) continue;

        const value = updates[key];
        const allEmpty =
          !value ||
          (typeof value === "object" &&
            Object.values(value).every((v) => !v || v === ""));

        if (allEmpty) {
          unsetObj[key] = ""; // override yok, meta’dan gelsin diye sil
        } else {
          updateObj[key] = fillAllLocales(value);
        }
      } else if (updates[key] !== undefined) {
        updateObj[key] = updates[key];
      }
    }

    updateObj.updatedAt = new Date();

    // --- Güncelleme query’si
    const updateQuery: any = {};
    if (Object.keys(updateObj).length) updateQuery["$set"] = updateObj;
    if (Object.keys(unsetObj).length) updateQuery["$unset"] = unsetObj;

    const setting = await SectionSetting.findOneAndUpdate(
      { tenant, sectionKey },
      updateQuery,
      { new: true }
    );

    if (!setting) {
      res.status(404).json({
        success: false,
        message: t("admin.section.settingNotFound", locale, translations, {
          sectionKey,
        }),
      });
      return;
    }

    logger.withReq.info(
      req,
      `[SectionSetting] Updated: ${sectionKey} (${tenant})`,
      {
        module: "sectionSetting",
        tenant,
        sectionKey,
        update: updateQuery,
      }
    );

    res.status(200).json({
      success: true,
      message: t("admin.section.settingUpdated", locale, translations, {
        sectionKey,
      }),
      data: setting,
    });
  }
);

// --- 4️⃣ Delete SectionSetting ---
export const deleteSectionSetting = asyncHandler(
  async (req: Request, res: Response) => {
    const locale: SupportedLocale = req.locale || "en";
    const tenant: string = req.tenant;
    const { sectionKey } = req.params;
    const { SectionSetting } = await getTenantModels(req);

    if (!tenant || !sectionKey) {
      res.status(400).json({
        success: false,
        message: t(
          "admin.module.tenantAndSectionKeyRequired",
          locale,
          translations
        ),
      });
      return;
    }

    const exists = await SectionSetting.findOne({ tenant, sectionKey });
    if (!exists) {
      res.status(404).json({
        success: false,
        message: t("admin.section.settingNotFound", locale, translations, {
          sectionKey,
        }),
      });
      return;
    }

    await SectionSetting.deleteOne({ tenant, sectionKey });

    logger.withReq.info(
      req,
      `[SectionSetting] Deleted: ${sectionKey} (${tenant})`,
      {
        module: "sectionSetting",
        tenant,
        sectionKey,
      }
    );

    res.json({
      success: true,
      message: t("admin.section.settingDeleted", locale, translations, {
        sectionKey,
      }),
    });
  }
);
