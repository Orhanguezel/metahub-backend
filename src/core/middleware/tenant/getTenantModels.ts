// src/core/middleware/tenant/getTenantModels.ts
import { Request } from "express";

// ✅ Doğrudan model export edilen modüller
import { Settings } from "@/modules/settings/settings.models";
import { User } from "@/modules/users/users.models";
import { Product } from "@/modules/product/product.models";
import { Order } from "@/modules/order/order.models";
import { Cart } from "@/modules/cart/cart.models";
import { Blog } from "@/modules/blog/models";
import { BlogCategory } from "@/modules/blogcategory/category.models";
import { Booking } from "@/modules/booking/booking.models";
import {
  BookingSlotRule,
  BookingSlotOverride,
} from "@/modules/bookingslot/bookingslot.models";
import { Coupon } from "@/modules/coupon/coupon.models";
import { Gallery } from "@/modules/gallery/gallery.models";
import { GalleryCategory } from "@/modules/gallerycategory/models";
import { Services } from "@/modules/services/models";
import { ServicesCategory } from "@/modules/servicescategory/category.models";
import { Stockmovement } from "@/modules/stockmovement/stockmovement.models";
import { Notification } from "@/modules/notification/notification.models";
import { Comment } from "@/modules/comment/comment.models";
import { Review } from "@/modules/review/review.models";
import { ContactMessage } from "@/modules/contact/contact.models";
import { EmailMessage } from "@/modules/email/email.models";
import { Wishlist } from "@/modules/wishlist/wishlist.models";
import { Favorite } from "@/modules/favorite/favorite.model";
import { Feedback } from "@/modules/feedback/feedback.models";
import { Address } from "@/modules/address/address.models";
import { Company } from "@/modules/company/company.models";
import { Customer } from "@/modules/customer/customer.models";
import { FAQ } from "@/modules/faq/faq.models";
import { Invoice } from "@/modules/invoice/invoice.models";
import { Offer } from "@/modules/offer/offer.models";
import { Payment } from "@/modules/payment/payment.models";
import { Shipment } from "@/modules/shipment/shipment.models";
import { Task } from "@/modules/task/task.models";
import { Activity } from "@/modules/activity/models";
import { ActivityCategory } from "@/modules/activitycategory/category.models";
import { About } from "@/modules/about/models";
import { AboutCategory } from "@/modules/aboutcategory/category.models";
import { Experience } from "@/modules/experience/experience.models";
import { References } from "@/modules/references/models";
import { ReferencesCategory } from "@/modules/referencescategory/category.models";
import { Articles } from "@/modules/articles/models";
import { ArticlesCategory } from "@/modules/articlescategory/category.models";
import { Library } from "@/modules/library/library.models";
import { ChatMessage, ChatSession } from "@/modules/chat/models";
import { EnsotekProd } from "@/modules/ensotekprod/ensotekprod.models";
import { EnsotekCategory } from "@/modules/ensotekcategory/ensotekcategory.models";
import { Sport } from "@/modules/sport/sport.models";
import { SportCategory } from "@/modules/sportcategory/sportcategory.models";
import { Bike } from "@/modules/bikes/model";
import { BikeCategory } from "@/modules/bikescategory/models";
import { SectionSetting,SectionMeta } from "@/modules/section/section.models";
import { Apartment } from "@/modules/apartment/apartment.model";
import { ApartmentCategory } from "@/modules/apartmentcategory/apartmentcategory.models";
import { Apikey, Apikeylog } from "@/modules/apikey/apikey.models";
import { News } from "@/modules/news/models";
import { NewsCategory } from "@/modules/newscategory/category.models";
import { Analytics } from "@/modules/analytics/analytics.models";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import { Sparepart } from "@/modules/sparepart/sparepart.models";
import { Tenants } from "@/modules/tenants/tenants.model";

export const getTenantModels = async (req: Request) => ({
  Settings: await req.getModel("Settings", Settings.schema),
  User: await req.getModel("User", User.schema),
  Product: await req.getModel("Product", Product.schema),
  Order: await req.getModel("Order", Order.schema),
  Cart: await req.getModel("Cart", Cart.schema),
  Blog: await req.getModel("Blog", Blog.schema),
  BlogCategory: await req.getModel("BlogCategory", BlogCategory.schema),
  Booking: await req.getModel("Booking", Booking.schema),
  BookingSlotRule: await req.getModel(
    "BookingSlotRule",
    BookingSlotRule.schema
  ),
  BookingSlotOverride: await req.getModel(
    "BookingSlotOverride",
    BookingSlotOverride.schema
  ),
  Coupon: await req.getModel("Coupon", Coupon.schema),
  Gallery: await req.getModel("Gallery", Gallery.schema),
  GalleryCategory: await req.getModel(
    "GalleryCategory",
    GalleryCategory.schema
  ),
  Services: await req.getModel("Services", Services.schema),
  ServicesCategory: await req.getModel(
    "ServicesCategory",
    ServicesCategory.schema
  ),
  StockMovement: await req.getModel("StockMovement", Stockmovement.schema),
  Notification: await req.getModel("Notification", Notification.schema),
  Comment: await req.getModel("Comment", Comment.schema),
  Review: await req.getModel("Review", Review.schema),
  ContactMessage: await req.getModel("ContactMessage", ContactMessage.schema),
  EmailMessage: await req.getModel("EmailMessage", EmailMessage.schema),
  Wishlist: await req.getModel("Wishlist", Wishlist.schema),
  Favorite: await req.getModel("Favorite", Favorite.schema),
  Feedback: await req.getModel("Feedback", Feedback.schema),
  Address: await req.getModel("Address", Address.schema),
  Company: await req.getModel("Company", Company.schema),
  Customer: await req.getModel("Customer", Customer.schema),
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
  References: await req.getModel("References", References.schema),
  ReferencesCategory: await req.getModel(
    "ReferencesCategory",
    ReferencesCategory.schema
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
  SectionSetting: await req.getModel("SectionSetting", SectionSetting.schema),
  SectionMeta: await req.getModel("SectionMeta", SectionMeta.schema),
  Apartment: await req.getModel("Apartment", Apartment.schema),
  ApartmentCategory: await req.getModel(
    "ApartmentCategory",
    ApartmentCategory.schema
  ),
  Apikey: await req.getModel("Apikey", Apikey.schema),
  Apikeylog: await req.getModel("Apikeylog", Apikeylog.schema),
  News: await req.getModel("News", News.schema),
  NewsCategory: await req.getModel("NewsCategory", NewsCategory.schema),
  Analytics: await req.getModel("Analytics", Analytics.schema),
  ModuleMeta: await req.getModel("ModuleMeta", ModuleMeta.schema),
  ModuleSetting: await req.getModel("ModuleSetting", ModuleSetting.schema),
  FAQ: await req.getModel("FAQ", FAQ.schema),
  Stockmovement: await req.getModel("Stockmovement", Stockmovement.schema),
  Sparepart: await req.getModel("Sparepart", Sparepart.schema),
  Tenants: await req.getModel("Tenants", Tenants.schema),
});
