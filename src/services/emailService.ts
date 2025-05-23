import {transporter} from "@/core/config/emailConfig";

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
      : "no-reply@example.com");

  const mailOptions = {
    from: sender,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const env = process.env.APP_ENV || "default";

    console.log(
      `📧 [${env}] Email sent successfully | Message ID: ${info.messageId}`
    );
    console.log("📨 To:", mailOptions.to);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
};
