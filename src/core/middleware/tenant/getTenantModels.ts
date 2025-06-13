// src/core/middleware/tenant/getTenantModels.ts
import { Request } from "express";

// ✅ Doğrudan model export edilen modüller
import { Setting } from "@/modules/setting";
import { User } from "@/modules/users";
import { Product } from "@/modules/product";
import { Order } from "@/modules/order";
import { Cart } from "@/modules/cart";
import { Blog } from "@/modules/blog";
import { BlogCategory } from "@/modules/blogcategory";
import { Coupon } from "@/modules/coupon";
import { Gallery } from "@/modules/gallery";
import { GalleryCategory } from "@/modules/gallerycategory";
import { Services } from "@/modules/services";
import { ServicesCategory } from "@/modules/servicescategory";
import { Booking } from "@/modules/booking";
import { Stockmovement } from "@/modules/stockmovement";
import { Notification } from "@/modules/notification";
import { Comment } from "@/modules/comment";
import { Review } from "@/modules/review";
import { ContactMessage } from "@/modules/contact";
import { EmailMessage } from "@/modules/email";
import { Wishlist } from "@/modules/wishlist";
import { Favorite } from "@/modules/favorite";
import { Feedback } from "@/modules/feedback";
import { Address } from "@/modules/address";
import { Company } from "@/modules/company";
import { Customer } from "@/modules/customer";
import { FAQ } from "@/modules/faq";
import { Invoice } from "@/modules/invoice";
import { Offer } from "@/modules/offer";
import { Payment } from "@/modules/payment";
import { Shipment } from "@/modules/shipment";
import { Task } from "@/modules/task";
import { Activity } from "@/modules/activity";
import { ActivityCategory } from "@/modules/activitycategory";
import { About } from "@/modules/about";
import { AboutCategory } from "@/modules/aboutcategory";
import { Experience } from "@/modules/experience";
import { Reference } from "@/modules/references";
import { ReferenceCategory } from "@/modules/referencescategory";
import { Articles } from "@/modules/articles";
import { ArticlesCategory } from "@/modules/articlescategory";
import { Library } from "@/modules/library";
import { ChatMessage, ChatSession } from "@/modules/chat";
import { EnsotekProd } from "@/modules/ensotekprod";
import { EnsotekCategory } from "@/modules/ensotekcategory";
import { Sport } from "@/modules/sport";
import { SportCategory } from "@/modules/sportcategory";
import { Bike } from "@/modules/bikes";
import { BikeCategory } from "@/modules/bikescategory";
import { Section } from "@/modules/section";
import { Apartment } from "@/modules/apartment";
import { ApartmentCategory } from "@/modules/apartmentcategory";
import { Apikey } from "@/modules/apikey";
import { News } from "@/modules/news";
import { NewsCategory } from "@/modules/newscategory";
import { Analytics } from "@/modules/analytics";

export const getTenantModels = async (req: Request) => ({
  Setting: await req.getModel("Setting", Setting.schema),
  User: await req.getModel("User", User.schema),
  Product: await req.getModel("Product", Product.schema),
  Order: await req.getModel("Order", Order.schema),
  Cart: await req.getModel("Cart", Cart.schema),
  Blog: await req.getModel("Blog", Blog.schema),
  BlogCategory: await req.getModel("BlogCategory", BlogCategory.schema),
  Coupon: await req.getModel("Coupon", Coupon.schema),
  Gallery: await req.getModel("Gallery", Gallery.schema),
  GalleryCategory: await req.getModel(
    "GalleryCategory",
    GalleryCategory.schema
  ),
  Service: await req.getModel("Service", Services.schema),
  ServiceCategory: await req.getModel(
    "ServiceCategory",
    ServicesCategory.schema
  ),
  Appointment: await req.getModel("Booking", Booking.schema),
  StockMovement: await req.getModel("StockMovement", Stockmovement.schema),
  Notification: await req.getModel("Notification", Notification.schema),
  Comment: await req.getModel("Comment", Comment.schema),
  Review: await req.getModel("Review", Review.schema),
  Contact: await req.getModel("Contact", ContactMessage.schema),
  Email: await req.getModel("Email", EmailMessage.schema),
  Wishlist: await req.getModel("Wishlist", Wishlist.schema),
  Favorite: await req.getModel("Favorite", Favorite.schema),
  Feedback: await req.getModel("Feedback", Feedback.schema),
  Address: await req.getModel("Address", Address.schema),
  Company: await req.getModel("Company", Company.schema),
  Customer: await req.getModel("Customer", Customer.schema),
  Faq: await req.getModel("Faq", FAQ.schema),
  Invoice: await req.getModel("Invoice", Invoice.schema),
  Offer: await req.getModel("Offer", Offer.schema),
  Payment: await req.getModel("Payment", Payment.schema),
  Shipment: await req.getModel("Shipment", Shipment.schema),
  Task: await req.getModel("Task", Task.schema),
  Activity: await req.getModel("Activity", Activity.schema),
  ActivityCategory: await req.getModel(
    "ActivityCategory",
    ActivityCategory.schema
  ),
  About: await req.getModel("About", About.schema),
  AboutCategory: await req.getModel("AboutCategory", AboutCategory.schema),
  Experience: await req.getModel("Experience", Experience.schema),
  References: await req.getModel("References", Reference.schema),
  ReferencesCategory: await req.getModel(
    "ReferencesCategory",
    ReferenceCategory.schema
  ),
  Articles: await req.getModel("Articles", Articles.schema),
  ArticlesCategory: await req.getModel(
    "ArticlesCategory",
    ArticlesCategory.schema
  ),
  Library: await req.getModel("Library", Library.schema),
  ChatMessage: await req.getModel("ChatMessage", ChatMessage.schema),
  ChatSession: await req.getModel("ChatSession", ChatSession.schema),
  EnsotekProd: await req.getModel("EnsotekProd", EnsotekProd.schema),
  EnsotekCategory: await req.getModel(
    "EnsotekCategory",
    EnsotekCategory.schema
  ),
  Sport: await req.getModel("Sport", Sport.schema),
  SportCategory: await req.getModel("SportCategory", SportCategory.schema),
  Bike: await req.getModel("Bike", Bike.schema),
  BikeCategory: await req.getModel("BikeCategory", BikeCategory.schema),
  Section: await req.getModel("Section", Section.schema),
  Apartment: await req.getModel("Apartment", Apartment.schema),
  ApartmentCategory: await req.getModel(
    "ApartmentCategory",
    ApartmentCategory.schema
  ),
  ApiKey: await req.getModel("ApiKey", Apikey.schema),
  News: await req.getModel("News", News.schema),
  NewsCategory: await req.getModel("NewsCategory", NewsCategory.schema),
  Analytics: await req.getModel("Analytics", Analytics.schema),
});
