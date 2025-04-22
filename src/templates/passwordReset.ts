import { baseTemplate } from "./baseTemplate";

interface PasswordResetTemplateParams {
  name: string;
  resetLink: string;
  locale?: "tr" | "en" | "de";
}

const BRAND_NAME = process.env.BRAND_NAME || "Anastasia Massage";
const BRAND_TEAM_NAME = process.env.BRAND_TEAM_NAME || `${BRAND_NAME} Team`;

export const passwordResetTemplate = ({
  name,
  resetLink,
  locale = "de",
}: PasswordResetTemplateParams): string => {
  const translations = {
    de: {
      title: "🔐 Passwort zurücksetzen",
      greeting: `Hallo ${name},`,
      info: "Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.",
      action: "Klicken Sie auf den folgenden Button, um Ihr Passwort zurückzusetzen:",
      button: "Passwort zurücksetzen",
      footer: "Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.",
      sign: `Mit freundlichen Grüßen,<br/>Ihr ${BRAND_TEAM_NAME}`,
    },
    tr: {
      title: "🔐 Şifre Sıfırlama",
      greeting: `Merhaba ${name},`,
      info: "Şifrenizi sıfırlamak için bir talep aldık.",
      action: "Aşağıdaki butona tıklayarak şifrenizi sıfırlayabilirsiniz:",
      button: "Şifreyi Sıfırla",
      footer: "Eğer bu isteği siz yapmadıysanız, bu e-postayı yok sayabilirsiniz.",
      sign: `Saygılarımızla,<br/>${BRAND_TEAM_NAME}`,
    },
    en: {
      title: "🔐 Reset Your Password",
      greeting: `Hello ${name},`,
      info: "We received a request to reset your password.",
      action: "Click the button below to reset your password:",
      button: "Reset Password",
      footer: "If you didn’t request this, you can safely ignore this email.",
      sign: `Best regards,<br/>The ${BRAND_TEAM_NAME}`,
    },
  };

  const t = translations[locale];

  const content = `
    <h2>${t.greeting}</h2>
    <p>${t.info}</p>
    <p>${t.action}</p>
    <p style="text-align: center; margin: 20px 0;">
      <a href="${resetLink}" style="padding: 12px 24px; background-color: #7c3aed; color: white; text-decoration: none; border-radius: 8px;">
        ${t.button}
      </a>
    </p>
    <p>${t.footer}</p>
    <p>${t.sign}</p>
  `;

  return baseTemplate(content, t.title);
};
