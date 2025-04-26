
---

# 🛠️ CLI-Werkzeuge – MetaHub Backend

Dieses Dokument beschreibt die in MetaHub verwendeten Befehlszeilenwerkzeuge und deren Funktionen. Alle Befehle werden mit `bun` ausgeführt.

---

## 📦 `create:module` – Neues Modul erstellen

Erstellt ein vollständiges Backend-Modul inklusive Meta-Datei und Tests. Es stellt sicher, dass alle Module konsistent aufgebaut sind.

### 📌 Verwendung

```bash
bun run scripts/createModule.ts <modul-name>
```

### 📁 Erzeugte Struktur

```
src/modules/<modul-name>/
├── <modul>.controller.ts          # CRUD-Logik (Express)
├── <modul>.models.ts              # Mongoose-Schema
├── <modul>.routes.ts              # Endpunkte
├── <modul>.validation.ts          # Zod-Validierung
├── index.ts                       # Export-Schnittstelle
└── __tests__/
    └── <modul>.controller.spec.ts # Testvorlage
```

### 🧠 Automatisch erzeugt

```
meta-configs/metahub/<modul-name>.meta.json
```

> ⚠️ Modul wird **nicht automatisch** zu `.env.metahub` ➜ Manuelle Pflege von `ENABLED_MODULES` ist erforderlich.

---

## ✅ `metaValidator.ts` – Meta-Validierungswerkzeug

Prüft alle `.meta.json`-Dateien unter `meta-configs/metahub` auf Struktur und Konsistenz.

### 📌 Befehl

```bash
bun run src/scripts/metaValidator.ts
```

### 🔍 Validiert:

- JSON-Syntax & Format
- Erforderliche Felder: `name`, `icon`, `routes`
- Ob zugehöriges Modulverzeichnis existiert
- Ob das Modul in allen `.env.*` aktiviert ist

---

## 🔄 `generate:meta` – Meta-Dateien aus Modulen ableiten

Aktualisiert `.meta.json`-Dateien aus realem Code (`routes`, `controller`, `validation`) und schreibt diese:

- In das Dateisystem: `meta-configs/metahub/*.meta.json`
- In die Datenbank (`ModuleMeta` & `ModuleSetting`)

### 📌 Ausführung

```bash
bun run generate:meta
```

### 🧠 Features

- Erkennt gelöschte Module → Entfernt zugehörige Meta-Datei & DB-Einträge
- Bumped `version`, `lastUpdatedAt`, `updatedBy`
- Erkennt `authenticate`-Middleware zur Setzung von `auth: true`
- Unterstützt automatische `Zod`-zu-JSON Schema-Konvertierung (`body`)

---

## 📘 `generateSwaggerSpec.ts` – Swagger-Dokument erzeugen

Erstellt Swagger-Spezifikation (`swagger.json`) basierend auf allen `.meta.json`-Dateien aktivierter Module.

### 📌 Aufrufbar über:

```ts
await generateSwaggerSpecFromMeta()
```

> Wird von Swagger UI benötigt (`/api-docs`).

---

## 🧩 `setupSwagger.ts` – Swagger UI Integration

Bindet Swagger UI in den Express-Server ein.

### 🚀 Bereitgestellte Endpunkte

- `/swagger.json` → Maschinell erzeugte Swagger-Daten
- `/api-docs` → Interaktive Swagger-Oberfläche

### 🌐 Benötigte Umgebungsvariablen

| Variable            | Beschreibung                          |
|---------------------|----------------------------------------|
| `APP_ENV`           | Bestimmt `.env.*` Datei                |
| `PORT`              | Server-Port                            |
| `HOST`              | Basis-URL                              |
| `SWAGGER_BASE_URL`  | Setzt `server.url` für Swagger         |

---

## ❌ `watchMeta.ts` – **[veraltet]** Automatisches Meta-Watching

> **Hinweis:** Dieses Feature wurde deaktiviert, um unnötige Systemlast und Log-Spam zu vermeiden. Änderungen werden nur beim Neustart erkannt (via `generate:meta`).

---

## 🛠️ Geplante Erweiterungen

- `delete:module` → Entfernt Modulverzeichnis + zugehörige Meta + DB-Einträge
- `sync:admin` → Synchronisiert Meta in `ModuleSetting`
- `generate:form` → Erstellt Admin-Formulare automatisch aus `validation.ts`
- `--formdata` Flag → Für Uploads und Content-Type-Auswahl

---
