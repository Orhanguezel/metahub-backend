import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { Readable } from "stream";
import { MailMessage } from "@/modules/email";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// 🌐 Log dili belirleme (her zaman standart fonksiyon ile)
const lang: SupportedLocale = getLogLocale();

// 🌐 Environment variables
const { IMAP_USER, IMAP_PASS, IMAP_HOST, IMAP_PORT } = process.env;

if (!IMAP_USER || !IMAP_PASS || !IMAP_HOST || !IMAP_PORT) {
  throw new Error(t("imap.error.env", lang, translations));
}

// 📬 IMAP config
const imap = new Imap({
  user: IMAP_USER,
  password: IMAP_PASS,
  host: IMAP_HOST,
  port: Number(IMAP_PORT),
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

export const readInboxEmails = (): void => {
  imap.once("ready", () => {
    imap.openBox("INBOX", true, (err, _box) => {
      if (err) {
        logger.error(t("imap.error.openInbox", lang, translations) + ` ${err}`);
        return;
      }

      imap.search(["UNSEEN"], (err, results = []) => {
        if (err) {
          logger.error(t("imap.error.search", lang, translations) + ` ${err}`);
          imap.end();
          return;
        }

        if (!results.length) {
          logger.info(t("imap.nonew", lang, translations));
          imap.end();
          return;
        }

        const fetch = imap.fetch(results, { bodies: "" });

        fetch.on("message", (msg) => {
          msg.on("body", (stream: Readable) => {
            simpleParser(stream, async (err, parsed: ParsedMail) => {
              if (err) {
                logger.error(
                  t("imap.parse.error", lang, translations) + ` ${err}`
                );
                return;
              }
              try {
                await MailMessage.create({
                  from: parsed.from?.text || "Unknown Sender",
                  subject: {
                    de: parsed.subject || "(No Subject)",
                    en: parsed.subject || "(No Subject)",
                    tr: parsed.subject || "(No Subject)",
                  },
                  body: {
                    de: parsed.text || parsed.html || "(No Content)",
                    en: parsed.text || parsed.html || "(No Content)",
                    tr: parsed.text || parsed.html || "(No Content)",
                  },
                  date: parsed.date || new Date(),
                  isRead: false,
                });
                logger.info(t("imap.saved", lang, translations));
              } catch (dbErr) {
                logger.error(
                  t("imap.dbError", lang, translations) + ` ${dbErr}`
                );
              }
            });
          });
        });

        fetch.once("end", () => {
          logger.info(t("imap.allProcessed", lang, translations));
          imap.end();
        });
      });
    });
  });

  imap.once("error", (err: Error) => {
    logger.error(t("imap.connection.error", lang, translations) + ` ${err}`);
  });

  imap.once("end", () => {
    logger.info(t("imap.connection.closed", lang, translations));
  });

  imap.connect();
};
