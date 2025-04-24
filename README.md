
---

# 🌐 MetaHub Backend

MetaHub ist eine modulare und skalierbare Backend-Architektur auf Basis von **Node.js + TypeScript + MongoDB**, die mit mehreren Frontend-Projekten integriert werden kann.

> Bietet eine gemeinsame API-Infrastruktur für alle Frontend-Projekte.  
> Module können unabhängig entwickelt, aktiviert und mit Swagger dokumentiert werden.

---

## 🚀 Funktionen

✅ Unterstützung für mehrere Frontend-Projekte (`.env.metahub`, `.env.kuhlturm` usw.)  
✅ Modulbasierte Architektur  
✅ Automatische Swagger-Generierung  
✅ Mehrsprachiges Inhaltsmanagement  
✅ Schnelle Modulerstellung mit CLI  
✅ Automatisches Deployment via PM2, Webhook oder CI/CD  
✅ Testunterstützung mit Jest + Supertest

---

## 🧱 Technologien

- **Node.js (Bun Runtime)**
- **Express**
- **TypeScript**
- **Mongoose**
- **Zod (Validierung)**
- **Swagger UI**
- **Jest + Supertest** (Tests)
- **dotenv**, **fs**, **path**, **ts-node** usw.

---

## 📁 Projektstruktur (Übersicht)

```
src/
├── modules/         # Jedes Modul in einem eigenen Ordner
├── scripts/         # CLI-Skripte (z. B. createModule, metaValidator)
├── core/            # Gemeinsame Konfigurationen (auth, middleware, logger)
├── tools/           # Hilfsfunktionen
├── server.ts        # Express-Server
```

---

## 🛠️ Installation

```bash
bun install
bun run dev
```

Standardmäßig wird `.env.metahub` geladen. Für andere Umgebungen:

```bash
APP_ENV=kuhlturm bun run dev
```

---

## 🧪 Tests

```bash
bun test
```

---


## 📘 Dokumentation (Almanca)

| Datei | Beschreibung |
|-------|--------------|
| [`CLI_TOOLS.md`](./doc/CLI_TOOLS.md) | CLI-Tools zur Modulerstellung und Validierung |
| [`DEPLOYMENT.md`](./doc/DEPLOYMENT.md) | Anleitung zur Einrichtung und zum Deployment |
| [`META_SYSTEM.md`](./doc/META_SYSTEM.md) | Erklärung des Metadaten-Systems |
| [`MODULE_GUIDE.md`](./doc/MODULE_GUIDE.md) | Modulerstellung und Lifecycle |
| [`MULTILINGUAL.md`](./doc/MULTILINGUAL.md) | Mehrsprachigkeitsstrategie |
| [`SWAGGER_SETUP.md`](./doc/SWAGGER_SETUP.md) | Swagger-Konfiguration und Einrichtung |
| [`ROADMAP.md`](./doc/ROADMAP.md) | Projektfahrplan und Versionsübersicht |
---

## 🧠 Beitrag leisten

Ein neues Modul erstellen:

```bash
bun run scripts/createModule.ts mymodule
```

Dann mit `metaValidator` prüfen:

```bash
bun run scripts/metaValidator.ts
```

---

## 📌 Hinweise

- Swagger UI: [http://localhost:5014/api-docs](http://localhost:5014/api-docs)  
- Swagger JSON: [http://localhost:5014/swagger.json](http://localhost:5014/swagger.json)  
- MongoDB-Verbindungsdetails sind in den `.env.*` Dateien definiert  
- Gemeinsame Modul-Schemas werden automatisch aus Swagger geladen

---
