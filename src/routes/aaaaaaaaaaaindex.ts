import express, { Router } from "express";
import { analyticsLogger } from "../core/middleware/analyticsLogger";

// Her modül, kendi klasöründeki index.ts dosyası ile yükleniyor
import userModule from "../modules/users";
import productModule from "../modules/product";
import categoryModule from "../modules/category";
import orderModule from "../modules/order";
import paymentModule from "../modules/payment";
import blogModule from "../modules/blog";
import newsModule from "../modules/news";
import articlesModule from "../modules/articles";
import sparePartsModule from "../modules/sparepart";
import libraryModule from "../modules/library";
import referencesModule from "../modules/references";
import dashboardModule from "../modules/dashboard";
import cartModule from "../modules/cart";
import notificationModule from "../modules/notification";
import feedbackModule from "../modules/feedback";
import settingsModule from "../modules/setting";
import contactModule from "../modules/contact";
import galleryModule from "../modules/gallery";
import faqModule from "../modules/faq";
import commentModule from "../modules/comment";
import accountModule from "../modules/account";
import servicesModule from "../modules/services";
import emailModule from "../modules/email";
import addressModule from "../modules/address";
import chatModule from "../modules/chat";

const router: Router = express.Router();

// router.use(path, [middleware], module)
router.use("/users", userModule);
router.use("/products", analyticsLogger, productModule);
router.use("/orders", analyticsLogger, orderModule);
router.use("/blogs", analyticsLogger, blogModule);
router.use("/dashboard", dashboardModule);
router.use("/cart", analyticsLogger, cartModule);
router.use("/notifications", notificationModule);
router.use("/feedbacks", feedbackModule);
router.use("/contacts", contactModule);
router.use("/settings", settingsModule);
router.use("/faqs", faqModule);
router.use("/gallery", galleryModule);
router.use("/payments", paymentModule);
router.use("/account", analyticsLogger, accountModule);
router.use("/services", servicesModule);
router.use("/emails", emailModule);
router.use("/categories", categoryModule);
router.use("/news", analyticsLogger, newsModule);
router.use("/articles", analyticsLogger, articlesModule);
router.use("/spareparts", sparePartsModule);
router.use("/library", analyticsLogger, libraryModule);
router.use("/references", referencesModule);
router.use("/comments", commentModule);
router.use("/address", addressModule);
router.use("/chat", chatModule);

export default router;
