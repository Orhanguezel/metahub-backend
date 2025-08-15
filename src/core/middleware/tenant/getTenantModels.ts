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
import { Massage } from "@/modules/massage/models";
import { MassageCategory } from "@/modules/massagecategory/category.models";
import { Stockmovement } from "@/modules/stockmovement/stockmovement.models";
import { Notification } from "@/modules/notification/notification.models";
import { Comment } from "@/modules/comment/comment.models";
import { Review } from "@/modules/review/review.models";
import { ContactMessage } from "@/modules/contact/contact.models";
import { Newsletter } from "@/modules/newsletter/newsletter.models";
import { EmailMessage } from "@/modules/email/email.models";
import { Wishlist } from "@/modules/wishlist/wishlist.models";
import { Favorite } from "@/modules/favorite/favorite.model";
import { Feedback } from "@/modules/feedback/feedback.models";
import { Address } from "@/modules/address/address.models";
import { Company } from "@/modules/company/company.models";
import { Customer } from "@/modules/customer/models";
import { FAQ } from "@/modules/faq/faq.models";
import { Invoice } from "@/modules/invoicing/models";
import { Offer } from "@/modules/offer/offer.models";
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

export const getTenantModels = async (req: Request) => ({
  Settings: await req.getModel("settings", Settings.schema),
  User: await req.getModel("user", User.schema),
  Product: await req.getModel("product", Product.schema),
  Order: await req.getModel("order", Order.schema),
  Cart: await req.getModel("cart", Cart.schema),
  Blog: await req.getModel("blog", Blog.schema),
  BlogCategory: await req.getModel("blogcategory", BlogCategory.schema),
  Booking: await req.getModel("booking", Booking.schema),
  BookingSlotRule: await req.getModel(
    "bookingslotrule",
    BookingSlotRule.schema
  ),
  BookingSlotOverride: await req.getModel(
    "bookingslotoverride",
    BookingSlotOverride.schema
  ),
  Coupon: await req.getModel("coupon", Coupon.schema),
  Gallery: await req.getModel("gallery", Gallery.schema),
  GalleryCategory: await req.getModel(
    "gallerycategory",
    GalleryCategory.schema
  ),
  Services: await req.getModel("services", Services.schema),
  ServicesCategory: await req.getModel(
    "servicescategory",
    ServicesCategory.schema
  ),
  Massage: await req.getModel("massage", Massage.schema),
  MassageCategory: await req.getModel(
    "massagecategory",
    MassageCategory.schema
  ),
  StockMovement: await req.getModel("stockmovement", Stockmovement.schema),
  Notification: await req.getModel("notification", Notification.schema),
  Comment: await req.getModel("comment", Comment.schema),
  Review: await req.getModel("review", Review.schema),
  ContactMessage: await req.getModel("contactmessage", ContactMessage.schema),
  EmailMessage: await req.getModel("emailmessage", EmailMessage.schema),
  Wishlist: await req.getModel("wishlist", Wishlist.schema),
  Favorite: await req.getModel("favorite", Favorite.schema),
  Feedback: await req.getModel("feedback", Feedback.schema),
  Address: await req.getModel("address", Address.schema),
  Company: await req.getModel("company", Company.schema),
  Customer: await req.getModel("customer", Customer.schema),
  Invoice: await req.getModel("invoice", Invoice.schema),
  Offer: await req.getModel("offer", Offer.schema),
  Payment: await req.getModel("payment", Payment.schema),
  Shipment: await req.getModel("shipment", Shipment.schema),
  Task: await req.getModel("task", Task.schema),
  Activity: await req.getModel("activity", Activity.schema),
  ActivityCategory: await req.getModel(
    "activitycategory",
    ActivityCategory.schema
  ),
  About: await req.getModel("about", About.schema),
  AboutCategory: await req.getModel("aboutcategory", AboutCategory.schema),
  References: await req.getModel("references", References.schema),
  ReferencesCategory: await req.getModel(
    "referencescategory",
    ReferencesCategory.schema
  ),
  Articles: await req.getModel("articles", Articles.schema),
  ArticlesCategory: await req.getModel(
    "articlescategory",
    ArticlesCategory.schema
  ),
  Library: await req.getModel("library", Library.schema),
  LibraryCategory: await req.getModel(
    "librarycategory",
    LibraryCategory.schema
  ),
  ChatMessage: await req.getModel("chatmessage", ChatMessage.schema),
  ChatSession: await req.getModel("chatsession", ChatSession.schema),
  Ensotekprod: await req.getModel("ensotekprod", Ensotekprod.schema),
  EnsotekCategory: await req.getModel(
    "ensotekcategory",
    EnsotekCategory.schema
  ),
  Sport: await req.getModel("sport", Sport.schema),
  SportCategory: await req.getModel("sportcategory", SportCategory.schema),
  Bike: await req.getModel("bike", Bike.schema),
  BikeCategory: await req.getModel("bikecategory", BikeCategory.schema),
  SectionSetting: await req.getModel("sectionsetting", SectionSetting.schema),
  SectionMeta: await req.getModel("sectionmeta", SectionMeta.schema),
  Apartment: await req.getModel("apartment", Apartment.schema),
  Apikey: await req.getModel("apikey", Apikey.schema),
  Apikeylog: await req.getModel("apikeylog", Apikeylog.schema),
  News: await req.getModel("news", News.schema),
  NewsCategory: await req.getModel("newscategory", NewsCategory.schema),
  Analytics: await req.getModel("analytics", Analytics.schema),
  ModuleMeta: await req.getModel("modulemeta", ModuleMeta.schema),
  ModuleSetting: await req.getModel("modulesetting", ModuleSetting.schema),
  FAQ: await req.getModel("faq", FAQ.schema),
  Stockmovement: await req.getModel("stockmovement", Stockmovement.schema),
  Sparepart: await req.getModel("sparepart", Sparepart.schema),
  SparepartCategory: await req.getModel(
    "sparepartcategory",
    SparepartCategory.schema
  ),
  Tenants: await req.getModel("tenants", Tenants.schema),
  Team: await req.getModel("team", Team.schema),
  Portfolio: await req.getModel("portfolio", Portfolio.schema),
  Skill: await req.getModel("skill", Skill.schema),
  SkillCategory: await req.getModel("skillcategory", SkillCategory.schema),
  CatalogRequest: await req.getModel("catalogrequest", CatalogRequest.schema),
  Newsletter: await req.getModel("newsletter", Newsletter.schema),
  Pricing: await req.getModel("pricing", Pricing.schema),
  BillingPlan: await req.getModel("billingplan", BillingPlan.schema),
  BillingOccurrence: await req.getModel("billingoccurrence", BillingOccurrence.schema),
  Contract: await req.getModel("contract", Contract.schema),
  OperationJob: await req.getModel("operationjob", OperationJob.schema),
  OperationTemplate: await req.getModel("operationtemplate", OperationTemplate.schema),
  ReportRun: await req.getModel("reportrun", ReportRun.schema),
  ReportDefinition: await req.getModel("reportdefinition", ReportDefinition.schema),
  SchedulePlan: await req.getModel("scheduleplan", SchedulePlan.schema),
  TimeEntry: await req.getModel("timeentry", TimeEntry.schema),
  Employee: await req.getModel("employee", Employee.schema),
  Expense: await req.getModel("expense", Expense.schema),
  ServiceCatalog: await req.getModel("servicecatalog", ServiceCatalog.schema),
  Contact: await req.getModel("contact", Contact.schema),
  PriceList: await req.getModel("pricelist", PriceList.schema),
  PriceListItem: await req.getModel("pricelistitem", PriceListItem.schema),
  CashAccount: await req.getModel("cashaccount", CashAccount.schema),
  CashEntry: await req.getModel("cashentry", CashEntry.schema),
  FileObject: await req.getModel("fileobject", FileObject.schema),
  Neighborhood: await req.getModel("neighborhood", Neighborhood.schema),
});
