// src/core/middleware/tenant/getTenantModelsFromConnection.ts

import { Connection } from "mongoose";

// ✅ Tüm modül importları
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
import { Massage } from "@/modules/massage/models";
import { MassageCategory } from "@/modules/massagecategory/category.models";
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
import { Customer } from "@/modules/customer/models";
import { FAQ } from "@/modules/faq/faq.models";
import { Invoice } from "@/modules/invoicing/models";
import { Offer } from "@/modules/offer/models";
import { Payment } from "@/modules/payments/models";
import { Shipment } from "@/modules/shipment/shipment.models";
import { Task } from "@/modules/task/task.models";
import { Activity } from "@/modules/activity/models";
import { ActivityCategory } from "@/modules/activitycategory/category.models";
import { About } from "@/modules/about/models";
import { AboutCategory } from "@/modules/aboutcategory/category.models";
import { References } from "@/modules/references/models";
import { ReferencesCategory } from "@/modules/referencescategory/category.models";
import { Articles } from "@/modules/articles/models";
import { ArticlesCategory } from "@/modules/articlescategory/category.models";
import { Library } from "@/modules/library/models";
import { LibraryCategory } from "@/modules/librarycategory/category.models";
import { ChatMessage, ChatSession } from "@/modules/chat/models";
import { Ensotekprod } from "@/modules/ensotekprod/models";
import { EnsotekCategory } from "@/modules/ensotekcategory/models";
import { Sport } from "@/modules/sport/sport.models";
import { SportCategory } from "@/modules/sportcategory/sportcategory.models";
import { Bike } from "@/modules/bikes/model";
import { BikeCategory } from "@/modules/bikescategory/models";
import { SectionSetting, SectionMeta } from "@/modules/section/section.models";
import { Apikey, Apikeylog } from "@/modules/apikey/apikey.models";
import { News } from "@/modules/news/models";
import { NewsCategory } from "@/modules/newscategory/category.models";
import { Analytics } from "@/modules/analytics/analytics.models";
import { ModuleMeta, ModuleSetting } from "@/modules/modules/admin.models";
import { Sparepart } from "@/modules/sparepart/models";
import { SparepartCategory } from "@/modules/sparepartcategory/models";
import { Tenants } from "@/modules/tenants/tenants.model";
import { Team } from "@/modules/team/models";
import { Portfolio } from "@/modules/portfolio/models";
import { Skill } from "@/modules/skill/models";
import { SkillCategory } from "@/modules/skillcategory/category.models";
import { CatalogRequest } from "@/modules/catalog/catalog.models";
import { Newsletter } from "@/modules/newsletter/newsletter.models";
import { Pricing } from "@/modules/pricing/models";

import { Apartment } from "@/modules/apartment/models";
import { BillingPlan, BillingOccurrence } from "@/modules/billing/models";
import { Contract } from "@/modules/contracts/models";
import { OperationJob } from "@/modules/operationsjobs/models";
import { OperationTemplate } from "@/modules/operationstemplates/models";
import { ReportRun, ReportDefinition } from "@/modules/reports/models";
import { SchedulePlan } from "@/modules/scheduling/models";
import { TimeEntry } from "@/modules/timetracking/models";
import { Employee } from "@/modules/employees/models";
import { Expense } from "@/modules/expenses/models";
import { ServiceCatalog } from "@/modules/servicecatalog/models";
import { Contact } from "@/modules/contacts/models";
import { PriceList, PriceListItem } from "@/modules/pricelist/models";
import { CashAccount, CashEntry } from "@/modules/cashbook/models";
import { FileObject } from "@/modules/files/models";
import { Neighborhood } from "@/modules/neighborhood/models";

// ✅ Ana export
export const getTenantModelsFromConnection = (conn: Connection) => ({
  Settings: conn.model("settings", Settings.schema),
  User: conn.model("user", User.schema),
  Product: conn.model("product", Product.schema),
  Order: conn.model("order", Order.schema),
  Cart: conn.model("cart", Cart.schema),
  Blog: conn.model("blog", Blog.schema),
  BlogCategory: conn.model("blogcategory", BlogCategory.schema),
  Booking: conn.model("booking", Booking.schema),
  BookingSlotRule: conn.model("bookingslotrule", BookingSlotRule.schema),
  BookingSlotOverride: conn.model(
    "bookingslotoverride",
    BookingSlotOverride.schema
  ),
  Coupon: conn.model("coupon", Coupon.schema),
  Gallery: conn.model("gallery", Gallery.schema),
  GalleryCategory: conn.model("gallerycategory", GalleryCategory.schema),
  Services: conn.model("services", Services.schema),
  ServicesCategory: conn.model("servicescategory", ServicesCategory.schema),
  Massage: conn.model("massage", Massage.schema),
  MassageCategory: conn.model("massagecategory", MassageCategory.schema),
  Notification: conn.model("notification", Notification.schema),
  Comment: conn.model("comment", Comment.schema),
  Review: conn.model("review", Review.schema),
  ContactMessage: conn.model("contactmessage", ContactMessage.schema),
  EmailMessage: conn.model("emailmessage", EmailMessage.schema),
  Wishlist: conn.model("wishlist", Wishlist.schema),
  Favorite: conn.model("favorite", Favorite.schema),
  Feedback: conn.model("feedback", Feedback.schema),
  Address: conn.model("address", Address.schema),
  Company: conn.model("company", Company.schema),
  Customer: conn.model("customer", Customer.schema),
  Invoice: conn.model("invoice", Invoice.schema),
  Offer: conn.model("offer", Offer.schema),
  Payment: conn.model("payment", Payment.schema),
  Shipment: conn.model("shipment", Shipment.schema),
  Task: conn.model("task", Task.schema),
  Activity: conn.model("activity", Activity.schema),
  ActivityCategory: conn.model("activitycategory", ActivityCategory.schema),
  About: conn.model("about", About.schema),
  AboutCategory: conn.model("aboutcategory", AboutCategory.schema),
  References: conn.model("references", References.schema),
  ReferencesCategory: conn.model(
    "referencescategory",
    ReferencesCategory.schema
  ),
  Articles: conn.model("articles", Articles.schema),
  ArticlesCategory: conn.model("articlescategory", ArticlesCategory.schema),
  Library: conn.model("library", Library.schema),
  LibraryCategory: conn.model("librarycategory", LibraryCategory.schema),
  ChatMessage: conn.model("chatmessage", ChatMessage.schema),
  ChatSession: conn.model("chatsession", ChatSession.schema),
  Ensotekprod: conn.model("ensotekprod", Ensotekprod.schema),
  EnsotekCategory: conn.model("ensotekcategory", EnsotekCategory.schema),
  Sport: conn.model("sport", Sport.schema),
  SportCategory: conn.model("sportcategory", SportCategory.schema),
  Bike: conn.model("bike", Bike.schema),
  BikeCategory: conn.model("bikecategory", BikeCategory.schema),
  SectionSetting: conn.model("sectionsetting", SectionSetting.schema),
  SectionMeta: conn.model("sectionmeta", SectionMeta.schema),
  Apartment: conn.model("apartment", Apartment.schema),
  Apikey: conn.model("apikey", Apikey.schema),
  Apikeylog: conn.model("apikeylog", Apikeylog.schema),
  News: conn.model("news", News.schema),
  NewsCategory: conn.model("newscategory", NewsCategory.schema),
  Analytics: conn.model("analytics", Analytics.schema),
  ModuleMeta: conn.model("modulemeta", ModuleMeta.schema),
  ModuleSetting: conn.model("modulesetting", ModuleSetting.schema),
  FeedbackMessage: conn.model("FeedbackMessage", Feedback.schema),
  FAQ: conn.model("faq", FAQ.schema),
  Stockmovement: conn.model("stockmovement", Stockmovement.schema),
  Sparepart: conn.model("sparepart", Sparepart.schema),
  SparepartCategory: conn.model("sparepartcategory", SparepartCategory.schema),
  Tenants: conn.model("tenants", Tenants.schema),
  Team: conn.model("team", Team.schema),
  Portfolio: conn.model("portfolio", Portfolio.schema),
  Skill: conn.model("skill", Skill.schema),
  SkillCategory: conn.model("skillcategory", SkillCategory.schema),
  CatalogRequest: conn.model("catalogrequest", CatalogRequest.schema),
  Newsletter: conn.model("newsletter", Newsletter.schema),
  Pricing: conn.model("pricing", Pricing.schema),
  BillingPlan: conn.model("billingplan", BillingPlan.schema),
  BillingOccurrence: conn.model("billingoccurrence", BillingOccurrence.schema),
  Contract: conn.model("contract", Contract.schema),
  OperationJob: conn.model("operationjob", OperationJob.schema),
  OperationTemplate: conn.model("operationtemplate", OperationTemplate.schema),
  ReportRun: conn.model("reportrun", ReportRun.schema),
  ReportDefinition: conn.model("reportdefinition", ReportDefinition.schema),
  SchedulePlan: conn.model("scheduleplan", SchedulePlan.schema),
  TimeEntry: conn.model("timeentry", TimeEntry.schema),
  Employee: conn.model("employee", Employee.schema),
  Expense: conn.model("expense", Expense.schema),
  ServiceCatalog: conn.model("servicecatalog", ServiceCatalog.schema),
  Contact: conn.model("contact", Contact.schema),
  PriceList: conn.model("pricelist", PriceList.schema),
  PriceListItem: conn.model("pricelistitem", PriceListItem.schema),
  CashAccount: conn.model("cashaccount", CashAccount.schema),
  CashEntry: conn.model("cashentry", CashEntry.schema),
  FileObject: conn.model("fileobject", FileObject.schema),
  Neighborhood: conn.model("neighborhood", Neighborhood.schema),
});
