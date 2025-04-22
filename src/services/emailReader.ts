import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import dotenv from "dotenv";
import { Readable } from "stream";
import MailMessage from "../modules/email/email.models";

dotenv.config();

const imap = new Imap({
  user: process.env.IMAP_USER || "",
  password: process.env.IMAP_PASS || "",
  host: process.env.IMAP_HOST || "",
  port: Number(process.env.IMAP_PORT) || 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }, // Bazı sunucular için gerekli olabilir
});

export const readInboxEmails = (): void => {
  imap.once("ready", () => {
    imap.openBox("INBOX", true, (err, box) => {
      if (err) {
        console.error("📦 Fehler beim Öffnen des Posteingangs:", err);
        return;
      }

      imap.search(["UNSEEN"], (err, results = []) => {
        if (err) {
          console.error("🔍 Suchfehler:", err);
          imap.end();
          return;
        }

        if (!results.length) {
          console.log("📭 Keine neuen E-Mails.");
          imap.end();
          return;
        }

        const fetch = imap.fetch(results, { bodies: "" });

        fetch.on("message", (msg) => {
          msg.on("body", (stream: Readable) => {
            simpleParser(stream, async (err, parsed: ParsedMail) => {
              if (err) {
                console.error("📨 Fehler beim Parsen der E-Mail:", err);
                return;
              }

              try {
                await MailMessage.create({
                  from: parsed.from?.text || "Unbekannter Absender",
                  subject: parsed.subject || "(Kein Betreff)",
                  body: parsed.text || parsed.html || "(Kein Inhalt)",
                  date: parsed.date || new Date(),
                  isRead: false,
                });

                console.log("✅ E-Mail erfolgreich gespeichert.");
              } catch (dbErr) {
                console.error("❌ Fehler beim Speichern der E-Mail:", dbErr);
              }
            });
          });
        });

        fetch.once("end", () => {
          console.log("✅ Alle E-Mails verarbeitet.");
          imap.end();
        });
      });
    });
  });

  imap.once("error", (err: Error) => console.error("❌ IMAP Fehler:", err));
  imap.once("end", () => console.log("📴 Verbindung zum Mailserver beendet."));

  imap.connect();
};
