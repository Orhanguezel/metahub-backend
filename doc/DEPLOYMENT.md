
---

# 🚀 Bereitstellungsanleitung (`DEPLOYMENT.md`)

Dieses Dokument beschreibt die Schritte zur Bereitstellung des MetaHub-Projekts in einer **Produktionsumgebung**, einschließlich Konfiguration und wichtiger Hinweise.

---

## 🧱 Projektstruktur

- Das Projekt verwendet eine **modulare Backend-Architektur**, die für mehrere Frontend-Projekte geeignet ist.
- Umgebungsprofile werden durch `.env.metahub`, `.env.kuhlturm` usw. unterschieden.
- Für jedes Frontend-Projekt werden im Backend nur die benötigten Module über die `ENABLED_MODULES`-Liste aktiviert.

---

## 📁 Verzeichnisstruktur

```
metahub-backend/
├── .env.metahub
├── .env.kuhlturm
├── meta-configs/
│   └── metahub/
├── src/
│   ├── modules/
│   ├── core/
│   ├── scripts/
│   └── server.ts
└── public/
```

---

## ⚙️ Umgebungsvariablen (Environment Setup)

Die Dateien `.env.<profil>` sollten wie folgt aufgebaut sein:

```env
PORT=5014
HOST=http://localhost
APP_ENV=metahub

MONGO_URI=mongodb+srv://...
JWT_SECRET=...
SWAGGER_BASE_URL=http://localhost:5014/api

ENABLED_MODULES=blog,product,order,user,...
META_CONFIG_PATH=src/meta-configs/metahub
```

> Für jede Umgebung sollte eine eigene `.env`-Datei erstellt und die Variable `APP_ENV` korrekt gesetzt werden.

---

## 🔨 Build- & Startbefehle

### Entwicklungsumgebung:

```bash
bun run dev
```

> Startet mit `src/tools/generateMeta.ts` und anschließend `server.ts`.

### Produktionsumgebung (z. B. mit PM2):

```bash
bun build
pm2 start "bun run dist/server.js"
```

### Automatische Bereitstellung (Webhook + Git Pull + Restart)

1. GitHub Webhook wird bei einem Push ausgelöst
2. Das Skript `deploy.sh` wird ausgeführt:
   - `git pull`
   - `bun install`
   - `bun run generate:meta`
   - `pm2 restart backend`

---

## 🚀 Webhook-Beispiel (`deploy.sh`)

```bash
#!/bin/bash
cd /var/www/metahub-backend
git pull origin main
bun install
bun run src/tools/generateMeta.ts
pm2 restart metahub
```

> Auf dem Server: `chmod +x deploy.sh` und Start via `pm2`.

---

## 🧪 Letzte Überprüfungen

- [ ] Sind alle benötigten Module in `ENABLED_MODULES` der `.env.*`-Datei definiert?
- [ ] Existieren alle notwendigen Meta-Dateien?
- [ ] Funktioniert die MongoDB-Verbindung?
- [ ] Ist Swagger unter `/api-docs` erreichbar?
- [ ] Sind Token- und Sicherheitseinstellungen vollständig?

---

## 🧩 Potenziale für Weiterentwicklung

- [ ] CI/CD-Pipeline (GitHub Actions, GitLab CI etc.)
- [ ] Automatische Versionierung
- [ ] Umgebungsbasierte Protokollierung & Monitoring
- [ ] Zentrale Konfigurationsverwaltung (z. B. über `config/`-Verzeichnis)

---
