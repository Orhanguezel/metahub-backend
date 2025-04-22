// src/routes/index.ts

import { analyticsLogger } from "../core/middleware/analyticsLogger";


import express, { Router } from "express";
import userRoutes from "../modules/user/user.routes";
import productRoutes from "../modules/product/product.routes";

import categoryRoutes from "../modules/category/category.routes";
import orderRoutes from "../modules/order/order.routes";
import paymentRoutes from "../modules/payment/payment.routes";

import blogRoutes from "../modules/blog/blog.routes";
import newsRoutes from "../modules/news/news.routes";
import articlesRoutes from "../modules/articles/articles.routes";
import sparePartsRoutes from "../modules/sparePart/spareParts.routes";
import librarayRoutes from "../modules/library/library.routes";
import referencesRoutes from "../modules/references/references.routes";


import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import cartRoutes from "../modules/cart/cart.routes";
import notificationRoutes from "../modules/notification/notification.routes";
import feedbackRoutes from "../modules/feedback/feedback.routes";
import settingsRoutes from "../modules/setting/settings.routes";
import contactRoutes from "../modules/contact/contact.routes";
import galleryRoutes from "../modules/gallery/gallery.routes";
import faqRoutes from "../modules/faq/faq.routes";
import commentRoutes from "../modules/comment/comment.routes";


import accountRoutes from "../modules/account/account.routes";
import servicesRoutes from "../modules/services/services.routes";
import emailRoutes from "../modules/email/email.routes";
import addressRoutes from "../modules/address/address.routes";
import chatRoutes from "../modules/chat/chat.routes";




const router: Router = express.Router();

router.use("/users", userRoutes);
router.use("/products", analyticsLogger,productRoutes);
router.use("/orders", analyticsLogger,orderRoutes);
router.use("/blogs", analyticsLogger,blogRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/cart", analyticsLogger,cartRoutes);
router.use("/notifications", notificationRoutes);
router.use("/feedbacks", feedbackRoutes);
router.use("/contacts", contactRoutes);
router.use("/settings", settingsRoutes);
router.use("/faqs", faqRoutes);
router.use("/gallery", galleryRoutes);
router.use("/payments", paymentRoutes);
router.use("/account", analyticsLogger,accountRoutes);
router.use("/services", servicesRoutes);
router.use("/emails", emailRoutes);
router.use("/categories", categoryRoutes);
router.use("/news", analyticsLogger,newsRoutes);
router.use("/articles", analyticsLogger,articlesRoutes);
router.use("/spareparts", sparePartsRoutes);
router.use("/library", analyticsLogger,librarayRoutes);
router.use("/references", referencesRoutes);
router.use("/comments", commentRoutes);
router.use("/address", addressRoutes);
router.use("/chat", chatRoutes);


export default router;

