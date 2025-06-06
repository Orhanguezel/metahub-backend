import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { SocialMedia } from "@/modules/social";

// ✅ Get all social links
export const getAllSocialLinks = asyncHandler(async (_req: Request, res: Response) => {
  const socials = await SocialMedia.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "All social links fetched successfully.",
    data: socials,
  });
});

// ✅ Create new social link
export const createSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const { platform, link, icon } = req.body;

  const social = await SocialMedia.create({
    platform,
    link,
    icon,
  });

  res.status(201).json({
    success: true,
    message: "Social media link created successfully.",
    data: social,
  });
});

// ✅ Get single social link
export const getSocialLinkById = asyncHandler(async (req: Request, res: Response) => {
  const social = await SocialMedia.findById(req.params.id);
  if (!social) {
    res.status(404);
    throw new Error("Social media link not found.");
  }

  res.status(200).json({
    success: true,
    message: "Social media link fetched successfully.",
    data: social,
  });
});

// ✅ Update social link
export const updateSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const social = await SocialMedia.findById(req.params.id);
  if (!social) {
    res.status(404);
    throw new Error("Social media link not found.");
  }

  const { platform, link, icon } = req.body;

  social.platform = platform ?? social.platform;
  social.link = link ?? social.link;
  social.icon = icon ?? social.icon;

  await social.save();

  res.status(200).json({
    success: true,
    message: "Social media link updated successfully.",
    data: social,
  });
});

// ✅ Delete social link
export const deleteSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const social = await SocialMedia.findByIdAndDelete(req.params.id);
  if (!social) {
    res.status(404);
    throw new Error("Social media link not found or already deleted.");
  }

  res.status(200).json({
    success: true,
    message: "Social media link deleted successfully.",
  });
});
