import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Review } from "@/modules/review";
import { Types } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Tüm yorumları getir (Admin)
export const fetchReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { Review } = await getTenantModels(req);
    const reviews = await Review.find({ tenant: req.tenant }).populate(
      "user",
      "name email profileImage"
    );
    res.json(reviews);
  }
);

// ✅ Belirli bir ürünün yorumları
export const fetchProductReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { Review } = await getTenantModels(req);
    const reviews = await Review.find({
      product: req.params.productId,
      tenant: req.tenant,
    }).populate("user", "name profileImage");
    res.json(reviews);
  }
);

// ✅ Yeni yorum oluştur
export const addReview = asyncHandler(async (req: Request, res: Response) => {
  const { productId, rating, comment } = req.body;
  const { Review } = await getTenantModels(req);

  const review = await Review.create({
    user: req.user._id,
    product: Types.ObjectId.createFromHexString(productId),
    rating,
    comment,
    tenant: req.tenant,
  });

  res.status(201).json(review);
});

// ✅ Yorumu güncelle
export const updateReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { rating, comment } = req.body;
    const { Review } = await getTenantModels(req);
    const review = await Review.findOne({ tenant: req.tenant });

    if (!review) throw new Error("Yorum bulunamadı.");
    if (
      review.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      res.status(403).json({ message: "Yetkisiz işlem." });
      return;
    }

    review.rating = rating ?? review.rating;
    review.comment = comment ?? review.comment;
    review.editedAt = new Date();
    await review.save();

    res.json(review);
  }
);

// ✅ Yorumu sil
export const deleteReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { Review } = await getTenantModels(req);
    const review = await Review.findOne({ tenant: req.tenant });

    if (!review) throw new Error("Yorum bulunamadı.");
    if (
      review.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      res.status(403).json({ message: "Yetkisiz işlem." });
      return;
    }

    await review.deleteOne();
    res.json({ message: "Yorum silindi." });
  }
);

// ✅ Belirli kullanıcıya ait yorumlar (Admin)
export const getReviewsByUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { Review } = await getTenantModels(req);
    const reviews = await Review.find({
      user: req.params.userId,
      tenant: req.tenant,
    });
    res.json(reviews);
  }
);

// ✅ Belirli ürünün tüm yorumlarını sil (Admin)
export const deleteAllReviewsByProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const { Review } = await getTenantModels(req);
    await Review.deleteMany({
      product: req.params.productId,
      tenant: req.tenant,
    });
    res.json({ message: "Ürüne ait tüm yorumlar silindi." });
  }
);
