import twilio from "twilio";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import smsI18n from "@/services/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

// Twilio env
const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhone = process.env.TWILIO_PHONE!;

const client = twilio(accountSid, authToken);

/**
 * SMS gönderir.
 * @param to Alıcı telefon numarası
 * @param code Opsiyonel kod
 * @param customMessage Manuel body (opsiyonel)
 */
export const sendSms = async (
  to: string,
  code?: string,
  customMessage?: string
) => {
  const lang = getLogLocale(); // her zaman parametresiz çağır!
  const body = customMessage
    ? customMessage
    : t("sms.body.default", lang, smsI18n, { code });

  try {
    const message = await client.messages.create({
      body,
      from: twilioPhone,
      to,
    });

    logger.info(t("sms.sent.success", lang, smsI18n, { to }));
    return message;
  } catch (error: any) {
    logger.error(
      t("sms.sent.error", lang, smsI18n, { error: error.message || error })
    );
    throw error;
  }
};
