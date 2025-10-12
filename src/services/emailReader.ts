// src/services/emailReader.ts

import { Tenants } from "@/modules/tenants/tenants.model";
import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { Readable } from "stream";
import { EmailMessage } from "@/modules/email/models";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/core/config/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

const lang: SupportedLocale = getLogLocale();

export async function readInboxEmails(tenantSlug: string): Promise<void> {
  // 1️⃣ IMAP configini tenant tablosundan çek
  const tenant = await Tenants.findOne({ slug: tenantSlug, isActive: true }).lean();
  const imapUser = tenant?.emailSettings?.imapUser;
  const imapPass = tenant?.emailSettings?.imapPass;
  const imapHost = tenant?.emailSettings?.imapHost;
  const imapPort = tenant?.emailSettings?.imapPort;
  const imapSecure = tenant?.emailSettings?.imapSecure ?? true; // default true

  if (!imapUser || !imapPass || !imapHost || !imapPort) {
    throw new Error(`[IMAP] IMAP ayarları bulunamadı! Tenant: ${tenantSlug}`);
  }

  // 2️⃣ IMAP bağlantısı oluştur
  const imap = new Imap({
    user: imapUser,
    password: imapPass,
    host: imapHost,
    port: imapPort,
    tls: imapSecure,
    tlsOptions: { rejectUnauthorized: false },
  });

  imap.once("ready", () => {
    imap.openBox("INBOX", true, (err, _box) => {
      if (err) {
        logger.error(`[${tenantSlug}] ` + t("imap.error.openInbox", lang, translations) + ` ${err}`);
        return;
      }
      imap.search(["UNSEEN"], (err, results = []) => {
        if (err) {
          logger.error(`[${tenantSlug}] ` + t("imap.error.search", lang, translations) + ` ${err}`);
          imap.end();
          return;
        }
        if (!results.length) {
          logger.info(`[${tenantSlug}] ` + t("imap.nonew", lang, translations));
          imap.end();
          return;
        }
        const fetch = imap.fetch(results, { bodies: "" });
        fetch.on("message", (msg) => {
          msg.on("body", (stream: Readable) => {
            simpleParser(stream, async (err, parsed: ParsedMail) => {
              if (err) {
                logger.error(`[${tenantSlug}] ` + t("imap.parse.error", lang, translations) + ` ${err}`);
                return;
              }
              try {
                await EmailMessage.create({
                  from: parsed.from?.text || "Unknown Sender",
                  tenant: tenantSlug,
                  subject: parsed.subject || "(No Subject)",
                  body: parsed.text || parsed.html || "(No Content)",
                  date: parsed.date || new Date(),
                  isRead: false,
                  isArchived: false,
                });
                logger.info(`[${tenantSlug}] ` + t("imap.saved", lang, translations));
              } catch (dbErr) {
                logger.error(`[${tenantSlug}] ` + t("imap.dbError", lang, translations) + ` ${dbErr}`);
              }
            });
          });
        });
        fetch.once("end", () => {
          logger.info(`[${tenantSlug}] ` + t("imap.allProcessed", lang, translations));
          imap.end();
        });
      });
    });
  });

  imap.once("error", (err: Error) => {
    logger.error(`[${tenantSlug}] ` + t("imap.connection.error", lang, translations) + ` ${err}`);
  });
  imap.once("end", () => {
    logger.info(`[${tenantSlug}] ` + t("imap.connection.closed", lang, translations));
  });

  imap.connect();
}
