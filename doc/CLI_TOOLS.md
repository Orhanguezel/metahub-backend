
---

# 🛠️ CLI-Werkzeuge – MetaHub Backend

Dieses Dokument beschreibt die in MetaHub verwendeten Befehlszeilenwerkzeuge und deren Funktionen. Alle Befehle werden mit `bun` ausgeführt.

---

## 📦 `create:module` – Neues Modul erstellen

Wird verwendet, um ein neues Backend-Modul zu generieren. Dank der modularen Struktur gewährleistet es Konsistenz und Wartbarkeit im Projekt.

### 📌 Verwendung

```bash
bun run scripts/createModule.ts <modul-name>
```

### 📁 Erzeugte Struktur

Folgende Dateistruktur wird automatisch erstellt:

```
src/modules/<modul-name>/
├── <modul>.controller.ts          # CRUD-Logik
├── <modul>.models.ts              # Mongoose-Schema
├── <modul>.routes.ts              # Express-Routen
├── <modul>.validation.ts          # Zod-Validierungsschema
├── index.ts                       # Modulausgabe
└── __tests__/
    └── <modul>.controller.spec.ts # Jest-Testvorlage
```

Zusätzlich wird folgende Meta-Datei erstellt:

```
meta-configs/metahub/<modul-name>.meta.json
```

> Es erfolgt **keine automatische Eintragung** in `.env.metahub`. Die Liste `ENABLED_MODULES` muss manuell gepflegt werden.

---

## ✅ `metaValidator.ts` – Meta-Validierungswerkzeug

Überprüft alle Dateien unter `meta-configs/metahub/*.meta.json`.

### 📌 Befehl

```bash
bun run src/scripts/metaValidator.ts
```

### 🔍 Prüft:

- JSON-Struktur und -Gültigkeit
- Erforderliche Felder: `name`, `icon`, `routes`
- Existenz des Modulordners
- Ob Modul in `.env.*` aktiviert ist

> Ein wichtiger Bestandteil zur Sicherstellung von Konsistenz bei Multi-Frontend-Setups.

---

## 📘 `generateSwaggerSpec.ts` – Swagger-Dokumentgenerierung

Erzeugt automatisch eine Swagger-JSON-Datei aus den `meta.json`-Dateien aller aktivierten Module.

### 📌 Funktion

```ts
await generateSwaggerSpecFromMeta()
```

> Wird zur Bereitstellung von `/swagger.json` für Swagger UI verwendet.

---

## 🧩 `setupSwagger.ts` – Swagger UI Integration

Bindet Swagger UI in die Express-Anwendung ein.

### 🚀 Features

- `/swagger.json` ➤ Automatisch generiertes Swagger-Dokument
- `/api-docs` ➤ Swagger UI Oberfläche
- Nutzt `generateSwaggerSpecFromMeta()` zur Inhaltserstellung

### 🌐 Umgebungsvariablen

| Variable            | Beschreibung                          |
|---------------------|----------------------------------------|
| `APP_ENV`           | Wählt die entsprechende `.env.*` Datei |
| `PORT`              | Server-Port                            |
| `HOST`              | Basis-URL für Swagger UI               |
| `SWAGGER_BASE_URL`  | Definition der Swagger `server.url`   |

---

## 📌 Weiterentwicklungsmöglichkeiten

- `delete:module` → Löscht Modulverzeichnis und Meta-Datei
- `sync:admin` → Synchronisiert Einstellungen aus Meta-Dateien in die DB
- `generate:form` → Automatische Erstellung von Form-Definitionen
- Unterstützung von Flags wie `--formdata` für Content-Type-Auswahl

---
