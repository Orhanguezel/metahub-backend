import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// .env ortam dosyasını dinamik profile göre yükle
const envProfile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const BRAND_NAME = process.env.BRAND_NAME || "Ensotek Cooling Systems";
const BRAND_WEBSITE = process.env.BRAND_WEBSITE || "https://ensotek.de";

export const baseTemplate = (content: string, title = BRAND_NAME): string => {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #f4f6f8;
          color: #2c3e50;
          padding: 2rem;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border: 1px solid #e0e0e0;
        }
        .footer {
          margin-top: 2rem;
          font-size: 0.85rem;
          color: #7f8c8d;
          text-align: center;
        }
        a {
          color: #7c3aed;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${content}
        <div class="footer">
          © ${new Date().getFullYear()} <strong>${BRAND_NAME}</strong> – Alle Rechte vorbehalten.
          <br/>
          <a href="${BRAND_WEBSITE}">${BRAND_WEBSITE.replace(/^https?:\/\//, "")}</a>
        </div>
      </div>
    </body>
    </html>
  `;
};
