

# 🚀 MetaHub Backend – Modulares API-System

MetaHub ist eine moderne, modulare Backend-Architektur auf Basis von **Node.js**, **Express**, **TypeScript** und **MongoDB**, die dynamisch erweiterbar ist. Sie dient mehreren Frontend-Projekten als API-Backend.

---

## 📦 Hauptfunktionen

✅ Unterstützung für mehrere Projekte (via `.env.metahub`, `.env.kuhlturm`, ...)  
✅ Vollständig modulare Struktur (jedes Modul unabhängig)  
✅ Automatische Swagger-Dokumentation  
✅ Meta-System mit Versionierung & Git-Tracking  
✅ CLI-Tool zur schnellen Modulerstellung  
✅ Mehrsprachige Labels (DE, EN, TR)  
✅ Deployment mit PM2, Git Webhook, CI/CD  
✅ Unit- & Integrationstests mit Jest + Supertest  

---

## 🧱 Projektstruktur

```bash
src/
├── modules/             # Jedes Modul im eigenen Verzeichnis
├── core/                # Auth, Middleware, Error-Handling, Logger
├── tools/               # Hilfsfunktionen
├── scripts/             # createModule, metaValidator etc.
├── meta-configs/        # Meta-Dateien für Swagger & Admin
├── server.ts            # Einstiegspunkt Express App
```

---

## ⚙️ Installation & Start

### 🔧 Installation

```bash
bun install
# oder
npm install
```

### 🟢 Start (DEV)

```bash
bun run dev
# oder
npm run dev
```

> Die Umgebungsvariable `APP_ENV` bestimmt welches Projekt geladen wird.

---

## 📁 Beispiel .env Datei

```dotenv
APP_ENV=metahub
PORT=5014
MONGO_URI=mongodb://localhost:27017/metahub
SWAGGER_BASE_URL=http://localhost:5014/api
PROJECT_NAME=MetaHub API
PROJECT_DESCRIPTION=Dokumentiertes REST API System für MetaHub
```

---

## 🧠 Meta-System (generate:meta)

Das Meta-System liest automatisch:

- Alle Module & deren Routen (`*.routes.ts`)
- Validierungen (`*.validation.ts`)
- und erstellt daraus `.meta.json` Dateien mit:

```json
{
  "version": "1.0.2",
  "updatedBy": {
    "username": "orhan",
    "commitHash": "a12b34..."
  },
  "routes": [
    {
      "method": "POST",
      "path": "/",
      "auth": true,
      "summary": "Neuen Benutzer erstellen"
    }
  ],
  "history": [...]
}
```

### ➕ Meta generieren

```bash
bun run generate:meta
```

---

## 🧹 Modul hinzufügen

Ein neues Modul wird **nicht** manuell erstellt.  
Verwende stattdessen den Generator:

```bash
bun run scripts/createModule.ts modulname
```

✅ Dies erzeugt automatisch:

- `modulname.controller.ts`  
- `modulname.routes.ts`  
- `modulname.validation.ts`  
- `modulname.models.ts`  
- `index.ts`  
- `__tests__/modulname.controller.spec.ts`  

...und:

- Ein Eintrag in `meta-configs/metahub/modulname.meta.json`
- MongoDB-Einträge in `ModuleMeta` und `ModuleSetting`

> **Kein manuelles Setup mehr erforderlich!**  
> Das CLI übernimmt alle Struktur- und Meta-Standards.

---

## 🔄 Module Updaten / Entfernen

Modulnamen, Label, Sichtbarkeit und Rollen können im **Admin-Modul** geändert oder gelöscht werden.

> Änderungen werden automatisch in Meta & DB übernommen.

---

## 🧪 Tests

```bash
bun test
```

Supertest + Jest werden automatisch geladen.  
Tests befinden sich im `__tests__/` Verzeichnis jedes Moduls.

---

## 📘 Swagger

- Swagger UI: [`http://localhost:5014/api-docs`](http://localhost:5014/api-docs)  
- Swagger JSON: [`http://localhost:5014/swagger.json`](http://localhost:5014/swagger.json)

> Nur **aktivierte Module** (laut `ModuleSetting`) erscheinen im Swagger.

---

## 🧠 Nützliche Befehle

| Befehl                        | Beschreibung                             |
|-------------------------------|-------------------------------------------|
| `bun run dev`                | Startet lokalen Server + lädt Metas      |
| `bun run build`              | Transpiliert Code (TS ➝ JS)              |
| `bun run start`              | Startet Build über PM2                   |
| `bun run generate:meta`     | Führt Meta-Analyse & Schreibprozess aus  |
| `bun test`                  | Führt Unit- & Integrationstests aus      |

---

## 🧠 Git & Versionierung

Jede Änderung an einem Modul speichert:

- Git-Benutzername (`git config user.name`)
- Letzter Commit (`git rev-parse HEAD`)
- Zeitstempel & Patch-Version

Diese Informationen erscheinen in:
- Meta-Datei (`version`, `updatedBy`)
- Swagger-Dokumentation
- Admin-UI

---

## 🧩 Admin-UI

Admin-Panel unter `/admin`:

- Module verwalten (anzeigen, aktivieren, bearbeiten, löschen)
- Projekte umschalten (`metahub`, `kuhlturm`, ...)
- Multi-Language Labels editieren
- History & Versionen sichtbar

---

## 📌 Sonstiges

- Datenbank: MongoDB (via Mongoose)
- Authentifizierung: JWT Middleware
- Validierung: express-validator (kein Zod im Controller)
- Token-Management: secure httpOnly cookies

---

## 🧠 Beiträge

Wir freuen uns über jeden Beitrag:  
- Neue Module via `createModule.ts`  
- Swagger-Spezifikationen einhalten  
- Unit Tests mit Supertest  
- Klar beschriebene Commits  
- Meta vor jedem PR aktualisieren!

```bash
bun run generate:meta
```

---

## 🧠 Status

| Modul         | Status  |
|---------------|---------|
| Auth          | ✅       |
| Admin         | ✅       |
| Products      | ✅       |
| Orders        | 🔄       |
| Coupons       | ✅       |
| E-Mail        | ✅       |

---

## 🧠 Kontakt

Wenn du Fragen oder Wünsche hast, wende dich an:  
**Orhan G. – [@github.com/orhang](https://github.com/Orhanguezel)**  
> Mit Herz für modulare Architektur. ❤️
