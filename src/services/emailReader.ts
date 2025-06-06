// src/core/email/readInboxEmails.ts

import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { Readable } from "stream";
import { MailMessage } from "@/modules/email";

// 🌐 Environment variables
const {
  IMAP_USER,
  IMAP_PASS,
  IMAP_HOST,
  IMAP_PORT,
  APP_ENV,
  ACTIVE_META_PROFILE,
} = process.env;

if (!IMAP_USER || !IMAP_PASS || !IMAP_HOST || !IMAP_PORT) {
  throw new Error("❌ IMAP_* environment variables are not properly set.");
}

const profile = ACTIVE_META_PROFILE || APP_ENV;

if (!profile) {
  throw new Error("❌ APP_ENV or ACTIVE_META_PROFILE must be defined.");
}

// 🌐 Determine language for logs
const lang = profile === "tr" ? "tr" : profile === "de" ? "de" : "en";

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
        console.error(
          lang === "de"
            ? "📦 Fehler beim Öffnen des Posteingangs:"
            : lang === "tr"
            ? "📦 INBOX açılırken hata:"
            : "📦 Error opening inbox:",
          err
        );
        return;
      }

      imap.search(["UNSEEN"], (err, results = []) => {
        if (err) {
          console.error(
            lang === "de"
              ? "🔍 Suchfehler:"
              : lang === "tr"
              ? "🔍 Arama hatası:"
              : "🔍 Search error:",
            err
          );
          imap.end();
          return;
        }

        if (!results.length) {
          console.log(
            lang === "de"
              ? "📭 Keine neuen E-Mails."
              : lang === "tr"
              ? "📭 Yeni e-posta yok."
              : "📭 No new emails."
          );
          imap.end();
          return;
        }

        const fetch = imap.fetch(results, { bodies: "" });

        fetch.on("message", (msg) => {
          msg.on("body", (stream: Readable) => {
            simpleParser(stream, async (err, parsed: ParsedMail) => {
              if (err) {
                console.error(
                  lang === "de"
                    ? "📨 Fehler beim Parsen der E-Mail:"
                    : lang === "tr"
                    ? "📨 E-posta ayrıştırma hatası:"
                    : "📨 Email parse error:",
                  err
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

                console.log(
                  lang === "de"
                    ? "✅ E-Mail erfolgreich gespeichert."
                    : lang === "tr"
                    ? "✅ E-posta başarıyla kaydedildi."
                    : "✅ Email saved successfully."
                );
              } catch (dbErr) {
                console.error(
                  lang === "de"
                    ? "❌ Fehler beim Speichern der E-Mail:"
                    : lang === "tr"
                    ? "❌ E-posta veritabanına kaydedilemedi:"
                    : "❌ Failed to save email:",
                  dbErr
                );
              }
            });
          });
        });

        fetch.once("end", () => {
          console.log(
            lang === "de"
              ? "📬 Alle neuen E-Mails wurden verarbeitet."
              : lang === "tr"
              ? "📬 Tüm yeni e-postalar işlendi."
              : "📬 All new emails processed."
          );
          imap.end();
        });
      });
    });
  });

  imap.once("error", (err: Error) =>
    console.error(
      lang === "de"
        ? "❌ IMAP-Verbindungsfehler:"
        : lang === "tr"
        ? "❌ IMAP bağlantı hatası:"
        : "❌ IMAP connection error:",
      err
    )
  );

  imap.once("end", () =>
    console.log(
      lang === "de"
        ? "📴 Verbindung zum Mailserver beendet."
        : lang === "tr"
        ? "📴 Mail sunucusu bağlantısı kapatıldı."
        : "📴 IMAP connection closed."
    )
  );

  imap.connect();
};
