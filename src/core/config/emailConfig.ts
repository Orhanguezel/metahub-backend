import nodemailer from "nodemailer";

// 🔐 Required SMTP environment variables
const requiredVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "SMTP_FROM_NAME",
];

const missingVars = requiredVars.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.warn(`⚠️ Missing SMTP configuration: ${missingVars.join(", ")}`);
}

// 📤 Nodemailer transporter instance
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Optional connection test (development only)
if (process.env.NODE_ENV !== "production") {
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP connection failed:", error);
    } else {
      console.log("✅ SMTP connection successful.");
    }
  });
}

export { transporter };
