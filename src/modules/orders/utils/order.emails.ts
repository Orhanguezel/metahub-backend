import { sendEmail } from "@/services/emailService";
import { orderConfirmationTemplate } from "@/modules/orders/templates/orderConfirmation";
import type { SupportedLocale } from "@/types/common";

/** createOrder sonrası müşteri ve admin e-postaları */
export async function sendOrderEmails(args: {
  req: any;
  order: any;
  itemsForMail: string[];
  currency: string;
  locale: SupportedLocale;
  userName: string;
  userEmail: string;
  discountMajor: number;
  finalTotalMajor: number;
  couponDoc?: { code: string; discount: number } | null;
}) {
  const {
    req,
    order,
    itemsForMail,
    currency,
    locale,
    userName,
    userEmail,
    discountMajor,
    finalTotalMajor,
    couponDoc,
  } = args;

  const tenantData = (req as any).tenantData || {};
  const brandName = tenantData?.name?.[locale] || tenantData?.name?.en || tenantData?.name || "Brand";
  const brandWebsite = (tenantData?.domain?.main && `https://${tenantData.domain.main}`) || process.env.BRAND_WEBSITE;
  const senderEmail = tenantData?.emailSettings?.senderEmail || "noreply@example.com";
  const adminEmail = tenantData?.emailSettings?.adminEmail || senderEmail;

  // Customer mail
  try {
    if (userEmail) {
      await sendEmail({
        tenantSlug: req.tenant,
        to: userEmail,
        subject: `Your ${brandName} order confirmation`,
        html: orderConfirmationTemplate({
          name: order?.shippingAddress?.name || userName || "",
          itemsList: itemsForMail.join("<br/>"),
          totalPrice: finalTotalMajor,
          currency,
          locale,
          brandName,
          brandWebsite,
          senderEmail,
          orderId: String(order._id),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          criticalStockWarnings: "",
          couponCode: couponDoc ? `${couponDoc.code} (${couponDoc.discount}%)` : null,
          discount: discountMajor,
          finalTotal: finalTotalMajor,
        }) as string,
        from: senderEmail,
      });
    }
  } catch (_) {
    // swallow
  }

  // Admin mail
  try {
    if (adminEmail) {
      await sendEmail({
        tenantSlug: req.tenant,
        to: adminEmail,
        subject: `New order #${order._id} - ${brandName}`,
        html: `
          <h2>🧾 New Order - ${brandName}</h2>
          <ul>
            <li><strong>ID:</strong> ${order._id}</li>
            <li><strong>Service:</strong> ${order.serviceType}</li>
            ${order.serviceType === "dinein" ? `<li><strong>Table:</strong> ${order.tableNo || "-"}</li>` : ""}
            <li><strong>Items:</strong> ${itemsForMail.join("<br/>")}</li>
            <li><strong>Total:</strong> ${finalTotalMajor} ${currency}</li>
          </ul>
        `,
        from: senderEmail,
      });
    }
  } catch (_) {
    // swallow
  }
}
