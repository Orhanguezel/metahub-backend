// src/modules/dashboard/dashboard.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

// 📦 Tüm modüller index'lerinden import ediliyor
import { User } from "@/modules/users";
import { Product } from "@/modules/product";
import { Order } from "@/modules/order";
import { Blog } from "@/modules/blog";
import { News } from "@/modules/news";
import { Article } from "@/modules/articles";
import { SparePart } from "@/modules/sparepart";
import { Library } from "@/modules/library";
import { Reference } from "@/modules/references";
import { Cart } from "@/modules/cart";
import { Notification } from "@/modules/notification";
import { Feedback } from "@/modules/feedback";
import { ContactMessage } from "@/modules/contact";
import { Gallery } from "@/modules/gallery";
import { FAQ } from "@/modules/faq";
import { Comment } from "@/modules/comment";
import { Setting } from "@/modules/setting";
import { Payment } from "@/modules/payment";
import { Service } from "@/modules/services";
import { MailMessage } from "@/modules/email";
import { Address } from "@/modules/address";
import { ModuleMetaModel } from "@/modules/admin";
import { Appointment } from "@/modules/booking";
import { Category } from "@/modules/category";
import { ChatMessage } from "@/modules/chat";
import { Company } from "@/modules/company";
import { Coupon } from "@/modules/coupon";
import { Customer } from "@/modules/customer";
import { CustomPizza } from "@/modules/custompizza";
import { Discount } from "@/modules/discount";
import { Education } from "@/modules/education";
import { Experience } from "@/modules/experience";
import { Favorite } from "@/modules/favorite";
import { ForumCategory, ForumTopic, ForumComment } from "@/modules/forum";
import { Guestbook } from "@/modules/guestbook";
import { Invoice } from "@/modules/invoice";
import { Offer } from "@/modules/offer";
import { Review } from "@/modules/review";
import { Shipment } from "@/modules/shipment";
import { Skill } from "@/modules/skill";
import { SocialMedia } from "@/modules/social";
import { Sport } from "@/modules/sport";
import { Stockmovement } from "@/modules/stockmovement";
import { Task } from "@/modules/task";

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const counts = await Promise.all([
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
    MailMessage.countDocuments(),
    Address.countDocuments(),
    ModuleMetaModel.countDocuments(),
    Appointment.countDocuments(),
    Category.countDocuments(),
    ChatMessage.countDocuments(),
    Company.countDocuments(),
    Coupon.countDocuments(),
    Customer.countDocuments(),
    CustomPizza.countDocuments(),
    Discount.countDocuments(),
    Education.countDocuments(),
    Experience.countDocuments(),
    Favorite.countDocuments(),
    ForumCategory.countDocuments(),
    ForumTopic.countDocuments(),
    ForumComment.countDocuments(),
    Guestbook.countDocuments(),
    Invoice.countDocuments(),
    Offer.countDocuments(),
    Review.countDocuments(),
    Shipment.countDocuments(),
    Skill.countDocuments(),
    SocialMedia.countDocuments(),
    Sport.countDocuments(),
    Stockmovement.countDocuments(),
    Task.countDocuments(),
  ]);

  const revenueAgg = await Order.aggregate([
    { $group: { _id: null, total: { $sum: "$totalPrice" } } },
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;

  res.status(200).json({
    success: true,
    message: "Dashboard stats fetched successfully",
    stats: {
      users: counts[0],
      orders: counts[1],
      products: counts[2],
      blogs: counts[3],
      news: counts[4],
      articles: counts[5],
      spareParts: counts[6],
      library: counts[7],
      references: counts[8],
      carts: counts[9],
      notifications: counts[10],
      feedbacks: counts[11],
      contactMessages: counts[12],
      gallery: counts[13],
      faqs: counts[14],
      comments: counts[15],
      settings: counts[16],
      payments: counts[17],
      services: counts[18],
      emails: counts[19],
      addresses: counts[20],
      admins: counts[21],
      appointments: counts[22],
      categories: counts[23],
      chats: counts[24],
      companies: counts[25],
      coupons: counts[26],
      customers: counts[27],
      customPizzas: counts[28],
      discounts: counts[29],
      educations: counts[30],
      experiences: counts[31],
      favorites: counts[32],
      forums: counts[33],
      guestbooks: counts[34],
      invoices: counts[35],
      offers: counts[36],
      reviews: counts[37],
      shipments: counts[38],
      skills: counts[39],
      socials: counts[40],
      sports: counts[41],
      stockMovements: counts[42],
      tasks: counts[43],
      revenue: totalRevenue,
    },
  });
});
