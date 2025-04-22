import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

// 📦 Modeller
import User from "../users/users.models";
import Product from "../../modules/product/product.models";
import Order from "../../modules/order/order.models";
import Blog from "../../modules/blog/blog.models";
import News from "../../modules/news/news.models";
import Article from "../../modules/articles/articles.models";
import SparePart from "../sparepart/sparepart.models";
import Library from "../../modules/library/library.models";
import Reference from "../../modules/references/references.models";
import Cart from "../../modules/cart/cart.models";
import Notification from "../../modules/notification/notification.models";
import Feedback from "../../modules/feedback/feedback.models";
import ContactMessage from "../contact/contact.models";
import Gallery from "../../modules/gallery/gallery.models";
import FAQ from "../../modules/faq/faq.models";
import Comment from "../../modules/comment/comment.models";
import Setting from "../setting/setting.models";
import Payment from "../../modules/payment/payment.models";
import Service from "../services/services.models";
import Email from "../../modules/email/email.models";

// 📊 Admin Dashboard Verileri
export const getDashboardStats = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const [
      userCount,
      orderCount,
      productCount,
      blogCount,
      newsCount,
      articleCount,
      sparePartCount,
      libraryCount,
      referenceCount,
      cartCount,
      notificationCount,
      feedbackCount,
      contactMessageCount,
      galleryCount,
      faqCount,
      commentCount,
      settingCount,
      paymentCount,
      serviceCount,
      emailCount,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments(),
      Blog.countDocuments(),
      News.countDocuments(),
      Article.countDocuments(),
      SparePart.countDocuments(),
      Library.countDocuments(),
      Reference.countDocuments(),
      Cart.countDocuments(),
      Notification.countDocuments(),
      Feedback.countDocuments(),
      ContactMessage.countDocuments(),
      Gallery.countDocuments(),
      FAQ.countDocuments(),
      Comment.countDocuments(),
      Setting.countDocuments(),
      Payment.countDocuments(),
      Service.countDocuments(),
      Email.countDocuments(),
    ]);

    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Dashboard stats fetched successfully",
      stats: {
        users: userCount,
        products: productCount,
        orders: orderCount,
        revenue: totalRevenue,
        blogs: blogCount,
        news: newsCount,
        articles: articleCount,
        spareParts: sparePartCount,
        library: libraryCount,
        references: referenceCount,
        carts: cartCount,
        notifications: notificationCount,
        feedbacks: feedbackCount,
        contactMessages: contactMessageCount,
        gallery: galleryCount,
        faqs: faqCount,
        comments: commentCount,
        settings: settingCount,
        payments: paymentCount,
        services: serviceCount,
        emails: emailCount,
      },
    });
  }
);
