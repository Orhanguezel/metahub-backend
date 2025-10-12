// src/core/middleware/tenant/getTenantModels.ts
import { Request } from "express";

// ✅ Doğrudan model export edilen modüller
import { Settings } from "@/modules/settings/settings.models";
import { User } from "@/modules/users/users.models";
import { Blog } from "@/modules/blog/models";
import { BlogCategory } from "@/modules/blogcategory/category.models";
import { Booking } from "@/modules/booking/booking.models";
import {
  BookingSlotRule,
  BookingSlotOverride,
} from "@/modules/bookingslot/bookingslot.models";

import { Gallery } from "@/modules/gallery/models";
import { GalleryCategory } from "@/modules/gallerycategory/models";
import { Services } from "@/modules/services/models";
import { ServicesCategory } from "@/modules/servicescategory/category.models";
import { Massage } from "@/modules/massage/models";
import { MassageCategory } from "@/modules/massagecategory/category.models";
import { Stockmovement } from "@/modules/stockmovement/stockmovement.models";
import { Notification } from "@/modules/notification/notification.models";
import { Comment } from "@/modules/comment/models";
import { ContactMessage } from "@/modules/contact/models";
import { Newsletter } from "@/modules/newsletter/newsletter.models";
import { EmailMessage } from "@/modules/email/models";
import { Address } from "@/modules/address/models";
import { Company } from "@/modules/company/models";
import { Customer } from "@/modules/customer/models";
import { FAQ } from "@/modules/faq/models";
import { Invoice } from "@/modules/invoicing/models";
import { Order } from "@/modules/orders/models";
import { Offer } from "@/modules/offer/models";
import { Task } from "@/modules/task/task.models";
import { Activity } from "@/modules/activity/models";
import { ActivityCategory } from "@/modules/activitycategory/category.models";
import { About } from "@/modules/about/models";
import { Aboutus } from "@/modules/aboutus/models";
import { AboutCategory } from "@/modules/aboutcategory/category.models";
import { AboutusCategory } from "@/modules/aboutuscategory/category.models";
import { References } from "@/modules/references/models";
import { ReferencesCategory } from "@/modules/referencescategory/models";
import { Articles } from "@/modules/articles/models";
import { ArticlesCategory } from "@/modules/articlescategory/category.models";
import { Library } from "@/modules/library/models";
import { LibraryCategory } from "@/modules/librarycategory/category.models";
import { ChatMessage } from "@/modules/chat/message.model";
import { ChatSession } from "@/modules/chat/session.model";
import { Ensotekprod } from "@/modules/ensotekprod/models";
import { EnsotekCategory } from "@/modules/ensotekcategory/models";
import { Section } from "@/modules/section/models";
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

import { PricingPlan } from "@/modules/pricingplan/models";



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

import { Branch } from "@/modules/branch/models";
import { MenuCategory } from "@/modules/menucategory/models";
import { Menu } from "@/modules/menu/models";
import { MenuItem } from "@/modules/menuitem/models";
import { Promotion, PromotionRedemption } from "@/modules/promotions/models";

import { Reaction } from "@/modules/reactions/models";
import { Recipe } from "@/modules/recipes/models";
import { RecipeCategory } from "@/modules/recipescategory/models";
import { SeoSetting } from "@/modules/seo/models";
import { AuthIdentity, PasswordReset, EmailChange } from "@/modules/authlite/authlite.models";


import { Cart } from "@/modules/cart/models";
import { Coupon } from "@/modules/coupon/models";
import { Payment } from "@/modules/payments/domain/payment.models";
import { Shipment } from "@/modules/shipping/shipment.models";
import { ShippingMethod } from "@/modules/shipping/method/shipping-method.model";

import { Product } from "@/modules/product/models";
import { Category } from "@/modules/category/models";
import { Stockledger } from "@/modules/stockledger/models";
import { InventoryModel } from "@/modules/inventory/models";
import { PaymentGateway } from "@/modules/payments/gateway/models.gateway";
import { Brand } from "@/modules/brand/models";
import { ProductAttribute } from "@/modules/attributes/models";
import { FeeRule } from "@/modules/fees/fee.model";
import { ProductVariant } from "@/modules/variants/models";
import { GeoZone } from "@/modules/tax/models.geozone";
import { TaxRate } from "@/modules/tax/models.taxrate";
import { Wishlist } from "@/modules/wishlist/models";
import { Compare } from "@/modules/compare/models";
import { Review } from "@/modules/review/models";
import { WebhookDelivery, WebhookEndpoint } from "@/modules/payments/webhooks/models";
import { Suggestion } from "@/modules/search/suggestion.model";
import { SearchIndex } from "@/modules/search/search-index.model";
import { Pricing } from "@/modules/pricing/models";
import { PaymentIntent } from "@/modules/payments/intents/intent.models";
import { StorefrontSettings } from "@/modules/storefront/models";
import { ReturnRMA } from "@/modules/returns/model";
import { Giftcard } from "@/modules/giftcards/models";
import { LoyaltyLedger } from "@/modules/loyalty/models";
import { MediaAsset } from "@/modules/media/models";
import { Refund } from "@/modules/refunds/model";
import { ShippingGeoZone } from "@/modules/shipping/geozones/geozones.models";
import { UserReport } from "@/modules/product/userreport.model";
import { Seller } from "@/modules/sellers/models";



export const getTenantModels = async (req: Request) => ({
  Settings: await req.getModel("settings", Settings.schema),
  User: await req.getModel("user", User.schema),
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
  ContactMessage: await req.getModel("contactmessage", ContactMessage.schema),
  EmailMessage: await req.getModel("emailmessage", EmailMessage.schema),
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
  Section: await req.getModel("section", Section.schema),
  Apartment: await req.getModel("apartment", Apartment.schema),
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
  BillingOccurrence: await req.getModel(
    "billingoccurrence",
    BillingOccurrence.schema
  ),
  Contract: await req.getModel("contract", Contract.schema),
  OperationJob: await req.getModel("operationjob", OperationJob.schema),
  OperationTemplate: await req.getModel(
    "operationtemplate",
    OperationTemplate.schema
  ),
  ReportRun: await req.getModel("reportrun", ReportRun.schema),
  ReportDefinition: await req.getModel(
    "reportdefinition",
    ReportDefinition.schema
  ),
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

  Branch: await req.getModel("branch", Branch.schema),
  MenuCategory: await req.getModel("menucategory", MenuCategory.schema),
  Menu: await req.getModel("menu", Menu.schema),
  MenuItem: await req.getModel("menuitem", MenuItem.schema),
  Promotion: await req.getModel("promotion", Promotion.schema),
  PromotionRedemption: await req.getModel(
    "promotionredemption",
    PromotionRedemption.schema
  ),
  WebhookEndpoint: await req.getModel(
    "webhookendpoint",
    WebhookEndpoint.schema
  ),
  WebhookDelivery: await req.getModel(
    "webhookdelivery",
    WebhookDelivery.schema
  ),


  Reaction: await req.getModel("reaction", Reaction.schema),
  Recipe: await req.getModel("recipe", Recipe.schema),
  RecipeCategory: await req.getModel("recipecategory", RecipeCategory.schema),
  SeoSetting: await req.getModel("seosetting", SeoSetting.schema),
  AuthIdentity: await req.getModel("authidentity", AuthIdentity.schema),
  PasswordReset: await req.getModel("passwordreset", PasswordReset.schema),
  EmailChange: await req.getModel("emailchange", EmailChange.schema),
  Aboutus: await req.getModel("aboutus", Aboutus.schema),
  AboutusCategory: await req.getModel("aboutuscategory", AboutusCategory.schema),

  Product: await req.getModel("product", Product.schema),
  Category: await req.getModel("category", Category.schema),
  Stockledger: await req.getModel("stockledger", Stockledger.schema),
  PaymentGateway: await req.getModel("paymentgateway", PaymentGateway.schema),
  Brand: await req.getModel("brand", Brand.schema),
  ProductAttribute: await req.getModel("productattribute", ProductAttribute.schema),
  FeeRule: await req.getModel("fee", FeeRule.schema),
  ProductVariant: await req.getModel("productvariant", ProductVariant.schema),
  GeoZone: await req.getModel("geozone", GeoZone.schema),
  TaxRate: await req.getModel("taxrate", TaxRate.schema),
  Wishlist: await req.getModel("wishlist", Wishlist.schema),
  Compare: await req.getModel("compare", Compare.schema),
  Review: await req.getModel("review", Review.schema),
  Suggestion: await req.getModel("suggestion", Suggestion.schema),
  SearchIndex: await req.getModel("searchindex", SearchIndex.schema),
  ShippingMethod: await req.getModel("shippingmethod", ShippingMethod.schema),
  PricingPlan: await req.getModel("pricingplan", PricingPlan.schema),
  PaymentIntent: await req.getModel("paymentintent", PaymentIntent.schema),
  StorefrontSettings: await req.getModel("storefrontsettings", StorefrontSettings.schema),
  InventoryModel: await req.getModel("inventory", InventoryModel.schema),
  ReturnRMA: await req.getModel("returnrma", ReturnRMA.schema),
  Giftcard: await req.getModel("giftcard", Giftcard.schema),
  LoyaltyLedger: await req.getModel("loyaltyledger", LoyaltyLedger.schema),
  MediaAsset: await req.getModel("mediaasset", MediaAsset.schema),
  Refund: await req.getModel("refund", Refund.schema),
  ShippingGeoZone: await req.getModel("shippinggeozone", ShippingGeoZone.schema),
  UserReportModel: await req.getModel("userreport", UserReport.schema),
  Seller: await req.getModel("seller", Seller.schema),
});
