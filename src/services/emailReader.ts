import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { Readable } from "stream";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import {MailMessage} from "@/modules/email";

// 🌍 Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "ensotek";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`📨 ENV loaded: ${envPath}`);
} else {
  console.warn(`⚠️ ENV file not found for: ${envProfile}`);
}

// 🛠️ IMAP yapılandırması
const imap = new Imap({
  user: process.env.IMAP_USER || "",
  password: process.env.IMAP_PASS || "",
  host: process.env.IMAP_HOST || "",
  port: Number(process.env.IMAP_PORT) || 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

export const readInboxEmails = (): void => {
  imap.once("ready", () => {
    imap.openBox("INBOX", true, (err, _box) => {
      if (err) {
        console.error(
          envProfile === "de"
            ? "📦 Fehler beim Öffnen des Posteingangs:"
            : envProfile === "tr"
            ? "📦 INBOX açılırken hata:"
            : "📦 Error opening inbox:",
          err
        );
        return;
      }

      imap.search(["UNSEEN"], (err, results = []) => {
        if (err) {
          console.error(
            envProfile === "de"
              ? "🔍 Suchfehler:"
              : envProfile === "tr"
              ? "🔍 Arama hatası:"
              : "🔍 Search error:",
            err
          );
          imap.end();
          return;
        }

        if (!results.length) {
          console.log(
            envProfile === "de"
              ? "📭 Keine neuen E-Mails."
              : envProfile === "tr"
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
                  envProfile === "de"
                    ? "📨 Fehler beim Parsen der E-Mail:"
                    : envProfile === "tr"
                    ? "📨 E-posta ayrıştırma hatası:"
                    : "📨 Email parse error:",
                  err
                );
                return;
              }

              try {
                await MailMessage.create({
                  from: parsed.from?.text || "Unknown Sender",
                  subject: parsed.subject || "(No Subject)",
                  body: parsed.text || parsed.html || "(No Content)",
                  date: parsed.date || new Date(),
                  isRead: false,
                });

                console.log(
                  envProfile === "de"
                    ? "✅ E-Mail erfolgreich gespeichert."
                    : envProfile === "tr"
                    ? "✅ E-posta başarıyla kaydedildi."
                    : "✅ Email saved successfully."
                );
              } catch (dbErr) {
                console.error(
                  envProfile === "de"
                    ? "❌ Fehler beim Speichern der E-Mail:"
                    : envProfile === "tr"
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
            envProfile === "de"
              ? "📬 Alle neuen E-Mails wurden verarbeitet."
              : envProfile === "tr"
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
      envProfile === "de"
        ? "❌ IMAP-Verbindungsfehler:"
        : envProfile === "tr"
        ? "❌ IMAP bağlantı hatası:"
        : "❌ IMAP connection error:",
      err
    )
  );

  imap.once("end", () =>
    console.log(
      envProfile === "de"
        ? "📴 Verbindung zum Mailserver beendet."
        : envProfile === "tr"
        ? "📴 Mail sunucusu bağlantısı kapatıldı."
        : "📴 IMAP connection closed."
    )
  );

  imap.connect();
};
