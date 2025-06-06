import { baseTemplate } from "./baseTemplate";

interface WelcomeTemplateParams {
  name: string;
  locale?: "de" | "tr" | "en";
}

const BRAND_NAME = process.env.BRAND_NAME || "metahub";
const BRAND_FULL_NAME = process.env.BRAND_FULL_NAME || `${BRAND_NAME} `;
const BRAND_TEAM_NAME = process.env.BRAND_TEAM_NAME || `${BRAND_NAME} Team`;

export const welcomeTemplate = ({
  name,
  locale = "de",
}: WelcomeTemplateParams): string => {
  const translations = {
    de: {
      title: `Willkommen bei ${BRAND_NAME}`,
      greeting: `Willkommen, ${name}!`,
      message1: `Vielen Dank für Ihre Registrierung bei <strong>${BRAND_FULL_NAME}</strong>.`,
      message2: "Wir freuen uns, Sie auf dem Weg zu innovativer Kühltechnologie begleiten zu dürfen.",
      message3: "Ab jetzt können Sie unsere Produkte entdecken und online Bestellungen aufgeben.",
      sign: `Mit freundlichen Grüßen,<br/>Ihr ${BRAND_TEAM_NAME}`,
    },
    tr: {
      title: `${BRAND_NAME}'e Hoş Geldiniz`,
      greeting: `Merhaba ${name},`,
      message1: `<strong>${BRAND_FULL_NAME}</strong>'e kaydolduğunuz için teşekkür ederiz.`,
      message2: "Yenilikçi soğutma çözümleri yolculuğunuzda yanınızdayız.",
      message3: "Artık ürünlerimizi keşfedebilir ve çevrim içi sipariş verebilirsiniz.",
      sign: `Saygılarımızla,<br/>${BRAND_TEAM_NAME}`,
    },
    en: {
      title: `Welcome to ${BRAND_NAME}`,
      greeting: `Hello ${name},`,
      message1: `Thank you for registering with <strong>${BRAND_FULL_NAME}</strong>.`,
      message2: "We are excited to support you on your journey in cooling innovation.",
      message3: "You can now explore our products and place online orders.",
      sign: `Best regards,<br/>The ${BRAND_TEAM_NAME}`,
    },
  };

  const t = translations[locale];

  const content = `
    <h2>${t.greeting}</h2>
    <p>${t.message1}</p>
    <p>${t.message2}</p>
    <p>${t.message3}</p>
    <p>${t.sign}</p>
  `;

  return baseTemplate(content, t.title);
};
