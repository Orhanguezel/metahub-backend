import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Company } from "@/modules/company";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get company info (single record)
export const getCompanyInfo = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const company = await Company.findOne();
    if (!company) {
      res.status(404).json({
        success: false,
        message: "Company information not found.",
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Create company (only 1 allowed)
export const createCompany = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const exists = await Company.findOne();
    if (exists) {
      res.status(400).json({
        success: false,
        message: "A company is already registered.",
      });
      return;
    }

    // 🖼️ Normalize logo path if uploaded
    if (req.file && req.file.path) {
      req.body.logoUrl = req.file.path.replace(/\\/g, "/");
    }

    // 🧩 Ensure socialLinks object exists even if partially sent
    req.body.socialLinks = {
      facebook: req.body.socialLinks?.facebook || "",
      instagram: req.body.socialLinks?.instagram || "",
      twitter: req.body.socialLinks?.twitter || "",
      linkedin: req.body.socialLinks?.linkedin || "",
      youtube: req.body.socialLinks?.youtube || "",
    };

    const newCompany = await Company.create(req.body);

    res.status(201).json({
      success: true,
      message: "Company created successfully.",
      data: newCompany,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Update company info
export const updateCompanyInfo = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
      return;
    }

    // 🖼️ Normalize logo path if uploaded
    if (req.file && req.file.path) {
      req.body.logoUrl = req.file.path.replace(/\\/g, "/");
    }

    // 🧩 Ensure socialLinks object exists even if partially sent
    if (req.body.socialLinks) {
      req.body.socialLinks = {
        facebook: req.body.socialLinks?.facebook || "",
        instagram: req.body.socialLinks?.instagram || "",
        twitter: req.body.socialLinks?.twitter || "",
        linkedin: req.body.socialLinks?.linkedin || "",
        youtube: req.body.socialLinks?.youtube || "",
      };
    }

    const updated = await Company.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Company not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Company info updated.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});
