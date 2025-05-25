// src/services/smsService.ts
import twilio from "twilio";

const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhone = process.env.TWILIO_PHONE!;

const client = twilio(accountSid, authToken);

export const sendSms = async (to: string, message: string) => {
  return client.messages.create({
    body: message,
    from: twilioPhone,
    to,
  });
};
