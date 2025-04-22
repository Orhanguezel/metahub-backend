import transporter from "../core/config/emailConfig";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async ({
  to,
  subject,
  html,
  from,
}: EmailOptions): Promise<void> => {
  const sender =
    from ||
    (process.env.SMTP_FROM && process.env.SMTP_FROM_NAME
      ? `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`
      : undefined);

  const mailOptions = {
    from: sender,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    console.log("📨 Recipient:", mailOptions.to);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
  console.log("📧 Email sent successfully");
};
