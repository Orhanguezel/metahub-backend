// src/core/middleware/tenant/getTenantModelsFromConnection.ts

import { Connection } from "mongoose";

// ✅ Tüm modül importları
// ✅ Doğrudan model export edilen modüller
import { Setting } from "@/modules/setting/setting.models";
import { User } from "@/modules/users/users.models";
import { Product } from "@/modules/product/product.models";
import { Order } from "@/modules/order/order.models";
import { Cart } from "@/modules/cart/cart.models";
import { Blog } from "@/modules/blog/blog.models";
import { BlogCategory } from "@/modules/blogcategory/blogcategory.models";
import { Booking } from "@/modules/booking/booking.models";
import {
  BookingSlotRule,
  BookingSlotOverride,
} from "@/modules/bookingslot/bookingslot.models";
import { Coupon } from "@/modules/coupon/coupon.models";
import { Gallery } from "@/modules/gallery/gallery.models";
import { GalleryCategory } from "@/modules/gallerycategory/gallerycategory.models";
import { Services } from "@/modules/services/services.models";
import { ServicesCategory } from "@/modules/servicescategory/servicescategory.models";
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
import { Activity } from "@/modules/activity/activity.models";
import { ActivityCategory } from "@/modules/activitycategory/activitycategory.models";
import { About } from "@/modules/about/about.models";
import { AboutCategory } from "@/modules/aboutcategory/aboutcategory.models";
import { Experience } from "@/modules/experience/experience.models";
import { Reference } from "@/modules/references/models";
import { ReferenceCategory } from "@/modules/referencescategory/category.models";
import { Articles } from "@/modules/articles/articles.models";
import { ArticlesCategory } from "@/modules/articlescategory/articlescategory.models";
import { Library } from "@/modules/library/library.models";
import { ChatMessage, ChatSession } from "@/modules/chat/chat.models";
import { EnsotekProd } from "@/modules/ensotekprod/ensotekprod.models";
import { EnsotekCategory } from "@/modules/ensotekcategory/ensotekcategory.models";
import { Sport } from "@/modules/sport/sport.models";
import { SportCategory } from "@/modules/sportcategory/sportcategory.models";
import { Bike } from "@/modules/bikes/model";
import { BikeCategory } from "@/modules/bikescategory/models";
import { Section } from "@/modules/section/section.models";
import { Apartment } from "@/modules/apartment/apartment.model";
import { ApartmentCategory } from "@/modules/apartmentcategory/apartmentcategory.models";
import { Apikey, Apikeylog } from "@/modules/apikey/apikey.models";
import { News } from "@/modules/news/news.models";
import { NewsCategory } from "@/modules/newscategory";
import { Analytics } from "@/modules/analytics/analytics.models";
import { ModuleMeta, ModuleSetting } from "@/modules/admin/admin.models";
import { Sparepart } from "@/modules/sparepart/sparepart.models";

// ✅ Ana export
export const getTenantModelsFromConnection = (conn: Connection) => ({
  Setting: conn.model("Setting", Setting.schema),
  User: conn.model("User", User.schema),
  Product: conn.model("Product", Product.schema),
  Order: conn.model("Order", Order.schema),
  Cart: conn.model("Cart", Cart.schema),
  Blog: conn.model("Blog", Blog.schema),
  BlogCategory: conn.model("BlogCategory", BlogCategory.schema),
  Booking: conn.model("Booking", Booking.schema),
  BookingSlotRule: conn.model("BookingSlotRule", BookingSlotRule.schema),
  BookingSlotOverride: conn.model(
    "BookingSlotOverride",
    BookingSlotOverride.schema
  ),
  Coupon: conn.model("Coupon", Coupon.schema),
  Gallery: conn.model("Gallery", Gallery.schema),
  GalleryCategory: conn.model("GalleryCategory", GalleryCategory.schema),
  Services: conn.model("Services", Services.schema),
  ServiceCategory: conn.model("ServiceCategory", ServicesCategory.schema),
  StockMovement: conn.model("StockMovement", Stockmovement.schema),
  Notification: conn.model("Notification", Notification.schema),
  Comment: conn.model("Comment", Comment.schema),
  Review: conn.model("Review", Review.schema),
  ContactMessage: conn.model("ContactMessage", ContactMessage.schema),
  EmailMessage: conn.model("EmailMessage", EmailMessage.schema),
  Wishlist: conn.model("Wishlist", Wishlist.schema),
  Favorite: conn.model("Favorite", Favorite.schema),
  Feedback: conn.model("Feedback", Feedback.schema),
  Address: conn.model("Address", Address.schema),
  Company: conn.model("Company", Company.schema),
  Customer: conn.model("Customer", Customer.schema),
  Invoice: conn.model("Invoice", Invoice.schema),
  Offer: conn.model("Offer", Offer.schema),
  Payment: conn.model("Payment", Payment.schema),
  Shipment: conn.model("Shipment", Shipment.schema),
  Task: conn.model("Task", Task.schema),
  Activity: conn.model("Activity", Activity.schema),
  ActivityCategory: conn.model("ActivityCategory", ActivityCategory.schema),
  About: conn.model("About", About.schema),
  AboutCategory: conn.model("AboutCategory", AboutCategory.schema),
  Experience: conn.model("Experience", Experience.schema),
  References: conn.model("References", Reference.schema),
  ReferencesCategory: conn.model(
    "ReferencesCategory",
    ReferenceCategory.schema
  ),
  Articles: conn.model("Articles", Articles.schema),
  ArticlesCategory: conn.model("ArticlesCategory", ArticlesCategory.schema),
  Library: conn.model("Library", Library.schema),
  ChatMessage: conn.model("ChatMessage", ChatMessage.schema),
  ChatSession: conn.model("ChatSession", ChatSession.schema),
  EnsotekProd: conn.model("EnsotekProd", EnsotekProd.schema),
  EnsotekCategory: conn.model("EnsotekCategory", EnsotekCategory.schema),
  Sport: conn.model("Sport", Sport.schema),
  SportCategory: conn.model("SportCategory", SportCategory.schema),
  Bike: conn.model("Bike", Bike.schema),
  BikeCategory: conn.model("BikeCategory", BikeCategory.schema),
  Section: conn.model("Section", Section.schema),
  Apartment: conn.model("Apartment", Apartment.schema),
  ApartmentCategory: conn.model("ApartmentCategory", ApartmentCategory.schema),
  Apikey: conn.model("Apikey", Apikey.schema),
  Apikeylog: conn.model("Apikeylog", Apikeylog.schema),
  News: conn.model("News", News.schema),
  NewsCategory: conn.model("NewsCategory", NewsCategory.schema),
  Analytics: conn.model("Analytics", Analytics.schema),
  ModuleMeta: conn.model("ModuleMeta", ModuleMeta.schema),
  ModuleSetting: conn.model("ModuleSetting", ModuleSetting.schema),
  FeedbackMessage: conn.model("FeedbackMessage", Feedback.schema),
  FAQ: conn.model("FAQ", FAQ.schema),
  Stockmovement: conn.model("Stockmovement", Stockmovement.schema),
  Sparepart: conn.model("Sparepart", Sparepart.schema),
});
