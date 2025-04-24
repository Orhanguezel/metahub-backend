
---

# 🗺️ MetaHub Backend – Fahrplan (Roadmap)

Dieser Fahrplan beschreibt die geplante und bereits umgesetzte Entwicklung des MetaHub-Backends, gegliedert nach Versionen. Der Fokus liegt auf **Dokumentation**, **Funktionalität** und **technischer Infrastruktur**.

---

## ✅ **v1.0 – Stabile Basis (Abgeschlossen)**

### 🧩 Hauptfunktionen
- Modulare Backend-Architektur
- Integration von Mongoose + Zod + Express + TypeScript
- Unterstützung für mehrere Frontends (`.env.metahub`, `.env.kuhlturm`)

### 📘 Dokumentation
- [x] `README.md`
- [x] `CLI_TOOLS.md`
- [x] `META_SYSTEM.md`
- [x] `MODULE_GUIDE.md`
- [x] `MULTILINGUAL.md`
- [x] `SWAGGER_SETUP.md`
- [x] `DEPLOYMENT.md`

### 🔧 Infrastruktur
- Swagger UI Integration
- Automatisiertes Metadaten-System
- CLI-Tool: `createModule`
- Validierungs-Tool: `metaValidator`
- PM2 & Webhook Deployment-System

---

## 🚧 **v1.1 – Erweiterung & Automatisierung (Geplant)**

### 🎯 Ziel
- Erweiterung der Swagger-Spezifikationen mit `body`, `response`, `formType` usw.
- Automatisierung der Teststruktur
- Pflege der Meta-Daten über das Admin-Panel

### Geplante Funktionen
- [ ] Automatische Einbindung von `requestBody`-Schemata in Swagger
- [ ] Unterstützung für `formType`: `json` / `form-data`
- [ ] Definition von `response`-Schemas
- [ ] Swagger `definitions` Unterstützung
- [ ] `ModulePermission`-Struktur (`canCreate`, `canDelete`, ...)

### Kommende CLI-Tools
- [ ] `delete:module` → Modul und Metadatei löschen
- [ ] `generate:form` → Automatisierte Form-Schemas
- [ ] `sync:admin` → Metadaten in Datenbank synchronisieren

---

## 🔮 **v1.2 – CI/CD & Admin-Integration (Zukunft)**

### 📦 Funktionen
- [ ] CI/CD-Pipeline mit GitHub Actions
- [ ] Test-Coverage-Reporting
- [ ] Versionierung für jede Umgebung (`.env.metahub` z. B. `1.2.0`)

### 🛠️ Admin Panel
- [ ] Verwaltung von Meta-Daten per UI
- [ ] Aktivieren von Modulen im Panel
- [ ] Verlinkung zu Swagger-Dokumentationen

---

## 📌 Langfristige Ziele

| Bereich | Beschreibung |
|--------|--------------|
| 🌐 Mehrsprachiges Admin-Panel | UI vollständig übersetzbar |
| 🔍 Logging & Monitoring | Umgebungsspezifisches Logging, Integration von z. B. Sentry |
| 📊 Modulanalyse | Nutzungsstatistiken für Endpunkte |
| 🔐 RBAC-Zugriff | Rechteverwaltung auf Routenebene |
| 🧪 Test-Daten-Generator | Automatische Erstellung von Dummy-Daten |

---

## 🔁 Versionsübersicht

| Version | Status | Datum | Beschreibung |
|---------|--------|-------|--------------|
| `v1.0` | ✅ Veröffentlicht | April 2025 | Basisarchitektur und vollständige Dokumentation |
| `v1.1` | 🛠️ In Planung | Mai 2025 | Swagger- und Meta-Erweiterungen |
| `v1.2` | 🧠 Konzept | Ab Juni 2025 | CI/CD & Admin-Panel-Anbindung |

---
