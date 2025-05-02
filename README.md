
---

# 🚀 MetaHub Backend – Modulares API-System

MetaHub ist ein hochmodernes, modulares Backend-System auf Basis von **Node.js**, **Express**, **TypeScript** und **MongoDB**. Es wurde speziell dafür entwickelt, **multi-project-fähig** und **vollständig erweiterbar** zu sein, mit automatisierter Meta-Generierung und erstklassigem Swagger-Support.

---

## 📦 Hauptfunktionen

✅ Unterstützung für mehrere Projekte (z.B. `.env.metahub`, `.env.kuhlturm`, ...)  
✅ Vollständig modulare Struktur (jedes Modul ist autonom)  
✅ Automatische Swagger-Dokumentation (basierend auf Meta-Daten)  
✅ Dynamisches Meta-System (mit Versionierung & Git-Tracking)  
✅ **CLI-Generator** für Module, inkl. Tests, Validierung & mehr  
✅ Mehrsprachigkeit (Labels in DE, EN, TR)  
✅ Integration mit Pinecone, OpenAI, Ollama & mehr  
✅ Deployment mit **PM2**, Git Webhooks & CI/CD Pipelines  
✅ **Unit- & Integrationstests** (Jest + Supertest)  
✅ Logging & Monitoring (Analytics-Events, Logs via Dashboard)  
✅ WebSockets & Echtzeit-Features  
✅ Token-basierte Auth (secure httpOnly Cookies)  
✅ Dateiuploads (mit Upload-Typ & dynamischem Routing)

---

## 🧱 Projektstruktur

```bash
src/
├── modules/             # Jedes Modul hat: models, routes, controller, validation, tests
├── core/                # Globale Middleware, Auth, Error-Handler, Logger
├── tools/               # Utils: Token, File-Upload, DB-Utils, uvm.
├── scripts/             # CLI-Tools: createModule, generateMeta, Cleanup, Embeddings etc.
├── meta-configs/        # Meta-Dateien für Swagger & Admin-Panel
├── server.ts            # Einstiegspunkt Express App
├── socket.ts            # WebSocket-Initialisierung
└── swagger/             # Swagger Setup & Utils
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

> **Achtung:** Die Umgebungsvariable `APP_ENV` bestimmt das aktive Projekt (z.B. `metahub` oder `kuhlturm`).

### 🚀 Build & Deploy

```bash
bun run build
pm2 restart metahup-backend
```

---

## 📁 Beispiel .env Datei

```dotenv
APP_ENV=metahub
PORT=5014
MONGO_URI=mongodb://localhost:27017/metahub
SWAGGER_BASE_URL=http://localhost:5014/api
PROJECT_NAME=MetaHub API
PROJECT_DESCRIPTION=Dokumentiertes REST API System für MetaHub
PINECONE_API_KEY=xxx
OPENAI_API_KEY=xxx
SMTP_HOST=smtp.hostinger.com
SMTP_USER=info@deine-domain.de
SMTP_PASS=securepassword
```

---

## 🧠 Meta-System (generate:meta)

Das Meta-System liest automatisch:

- **Alle Module & deren Routen (`*.routes.ts`)**
- **Validierungen (`*.validation.ts`)**
- und generiert Meta-Dateien (`.meta.json`), die u.a. enthalten:

```json
{
  "version": "1.2.0",
  "updatedBy": {
    "username": "orhan",
    "commitHash": "a12b34..."
  },
  "routes": [
    {
      "method": "POST",
      "path": "/create",
      "auth": true,
      "summary": "Neues Produkt erstellen"
    }
  ],
  "history": [...]
}
```

✅ **Vollautomatisch für Swagger & Admin-Panel integriert.**

### ➕ Meta generieren

```bash
bun run generate:meta
```

---

## 🛠 Modul-Generator (CLI)

Ein neues Modul wird **nicht manuell** erstellt, sondern **per CLI**:

```bash
bun run scripts/createModule.ts modulname
```

✅ Es werden automatisch erstellt:

- `modulname.controller.ts`
- `modulname.routes.ts`
- `modulname.validation.ts`
- `modulname.models.ts`
- `index.ts`
- `__tests__/modulname.controller.spec.ts`
- Dynamische Einträge in `meta-configs/`
- MongoDB-Einträge (`ModuleMeta`, `ModuleSetting`)

> **Selbst Frontend-Generator ist integriert!**

---

## 🧪 Tests

```bash
bun test
```

- Tests werden **pro Modul** in `__tests__/` abgelegt.
- Supertest + Jest Setup **out of the box**.
- Tests werden **automatisch beim Modul-Create generiert** (Basis-Test).

---

## 📘 Swagger

- Swagger UI: [`http://localhost:5014/api-docs`](http://localhost:5014/api-docs)
- Swagger JSON: [`http://localhost:5014/swagger.json`](http://localhost:5014/swagger.json)

> **Nur aktivierte Module** erscheinen (laut `ModuleSetting`).

**Features:**
- Automatischer Import von Validierung
- Auto-Versionierung aus Meta
- Unterstützung für verschiedene Sprachen

---

## 🧠 Wichtige Tools & Scripts

| Befehl                        | Beschreibung                             |
|-------------------------------|-------------------------------------------|
| `bun run dev`                | Startet Server + Meta + Socket + Swagger |
| `bun run build`              | Baut TS ➝ JS + kopiert Meta-Dateien      |
| `pm2 restart metahup-backend`| Neustart für Deployment                  |
| `bun run generate:meta`     | Neue Meta-Daten generieren               |
| `bun run generate:embeddings`| Pinecone Embeddings generieren           |
| `bun run cleanup:api-logs`   | Alte API-Logs bereinigen                 |
| `bun test`                   | Jest + Supertest                         |

---

## 🔄 Meta & Git-Tracking

Jede Meta-Datei enthält:

- Aktuelle **Version**
- Letzten **Commit**
- Den **Benutzer**, der zuletzt Änderungen gemacht hat
- **Timestamp**

Diese Infos werden:

- In Swagger angezeigt
- Im Admin-Panel genutzt
- Für CI/CD History genutzt

---

## 💡 Architektur-Highlights

- **100% Modulares Design:** Kein Modul hängt von einem anderen ab.
- **Dynamic Imports:** Validierungen werden automatisch geladen.
- **Optimiert für Skalierung:** Pinecone + OpenAI + Ollama + Websockets.
- **Swagger & Meta automatisch synchronisiert**
- **Standardisierter Modulaufbau:** Einheitliche Struktur enforced
- **Dashboard & Admin-Panel:** Echtzeit-Daten + Steuerung

---

## 🚀 DevOps

- PM2 Deployment mit:
  ```bash
  pm2 start ecosystem.config.js
  ```
- Git Webhook für **Auto-Deploy**
- Logs:
  ```bash
  pm2 logs metahup-backend
  ```

---

## 🔐 Sicherheit

- **Auth:** JWT Tokens + httpOnly Cookies
- **Validation:** 100% via express-validator (keine leeren Routen!)
- **CORS, Helmet, Rate Limiter** inkludiert
- **Secure Uploads:** Multer + Upload-Typ-Management

---

## ✅ Status

| Modul         | Status  |
|---------------|---------|
| Auth          | ✅       |
| Admin         | ✅       |
| Products      | ✅       |
| Orders        | ✅       |
| Coupons       | ✅       |
| Payments      | ✅       |
| Dashboard     | ✅       |
| ...           | 🚀       |

---

## 📫 Kontakt


Wenn du Fragen oder Wünsche hast, wende dich an:  
**Orhan G. – [@github.com/orhang](https://github.com/Orhanguezel)**  
> Mit Herz für modulare Architektur. ❤️

---

## 💬 Letzte Anmerkung

✨ **Pro-Tipp:** Nutze den Modul-Generator konsequent – er ist goldwert! Jede neue Funktion (z.B. Pinecone, Ollama, Embeddings etc.) ist **plug & play** integrierbar.

---

➡️ **Wenn du weitere Details (z.B. Swagger Deep Dive, Pinecone Setup etc.) im README haben willst, sag einfach! 🚀**

