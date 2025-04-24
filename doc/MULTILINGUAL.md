
---

# 🌐 Mehrsprachiger Inhaltsarchitektur-Leitfaden (Multilingual Guide)

Dieses Dokument erklärt, wie mehrsprachige Daten (**i18n**) in der MetaHub-Backend-Architektur verwaltet werden und welche Strategien in welchen Szenarien angewendet werden sollen.

---

## 🎯 Ziel

- Aufbau einer internationalisierungsfähigen Backend-Struktur  
- Erleichterung der mehrsprachigen Inhaltserstellung pro Modul  
- Klare Trennung zwischen Benutzersprache und Datensprache

---

## ✅ Zwei Grundkonzepte

| Bereich                  | Definition                                                   |
|--------------------------|--------------------------------------------------------------|
| `language`-Feld          | Sprachauswahl des Benutzers für das UI                       |
| Mehrsprachige Datenstruktur | Felder wie `title`, `description` werden in mehreren Sprachen gespeichert |

---

## 📂 Strategie nach Modelltyp

| Modelltyp                    | `language`-Feld | Mehrsprachige Felder |
|-----------------------------|-----------------|------------------------|
| 🧍 Benutzer/System (`User`, `Settings`)   | ✅ Ja          | ❌ Nein               |
| 📝 Inhalt/Information (`Blog`, `FAQ`, `Service`) | ❌ Nein         | ✅ Ja                |

---

## 🧍 Systemmodelle

- Speichern die UI-Spracheinstellung des Benutzers.
- Beispiel:
```ts
user.language = "de";
```
- Felder wie `name`, `bio`, `notification.message` sind **eindimensional** (nicht lokalisiert).

---

## 📝 Inhaltsmodelle

Mehrsprachige Felder werden so definiert:

```ts
label: {
  tr: string;
  en: string;
  de: string;
},
description: {
  tr: string;
  en: string;
  de: string;
}
```

> 🔁 Das `slug`-Feld bleibt einzigartig: `slug: string`

---

## 📘 Beispiel: Blog-Schema

```ts
const blogSchema = new Schema({
  label: {
    tr: { type: String, required: true },
    en: { type: String, required: true },
    de: { type: String, required: true },
  },
  content: {
    tr: String,
    en: String,
    de: String,
  },
  slug: { type: String, unique: true },
});
```

---

## 🛠️ Inhaltspflege

- Im Admin-Panel erfolgt die Eingabe aller Sprachen über ein einziges Formular.  
- Felder wie `label.tr`, `label.en`, `label.de` befinden sich gemeinsam im Formular.  
- Es werden keine mehrfachen Einträge für jede Sprache erstellt.

---

## ⚠️ Wichtige Hinweise

- Mehrsprachige Felder sollen (wenn erforderlich) alle Sprachen wie `tr`, `en`, `de` enthalten.  
- Es gilt das Prinzip: **ein Dokument – mehrere Sprachfelder**.  
- Das `language`-Feld ist nur im Benutzerkontext relevant, nicht für Inhalte.  
- E-Mails, Feedbacks, Logs werden üblicherweise einsprachig gespeichert.

---

## 📌 Weiterentwicklungsmöglichkeiten

- [ ] Sprachbasierte Filterung im Admin-Panel  
- [ ] Automatisches Ausfüllen der bevorzugten Sprache  
- [ ] Validierung für fehlende Sprachfelder  
- [ ] Optionale AI-gestützte automatische Übersetzung

---

