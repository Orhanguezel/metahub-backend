
---

# 🧠 Meta-System – MetaHub Backend

Dieses Dokument erklärt, wie das `meta-configs/`-System im **MetaHub Backend** funktioniert und welche Rolle die `*.meta.json`-Dateien im Gesamtprojekt spielen.

---

## 🎯 Ziel

Das Meta-System definiert die technischen Merkmale jedes Moduls und wird verwendet für:

- ✅ Automatische Generierung von Swagger-Dokumentation
- ✅ Steuerung der Sichtbarkeit und Berechtigung im Admin-Panel
- ✅ Einheitliche Verwaltung von Versionierung und projektbasierten Einstellungen

---

## 🗂️ Verzeichnisstruktur

Für jedes Projekt existiert ein eigener Meta-Konfigurationsordner:

```
meta-configs/
└── metahub/
    ├── blog.meta.json
    ├── product.meta.json
    └── ...
```

Jede `.meta.json`-Datei steht für ein einzelnes Backend-Modul.

---

## 🧬 Aufbau einer Meta-Datei

### Beispiel: `blog.meta.json`

```json
{
  "name": "blog",
  "icon": "box",
  "visibleInSidebar": true,
  "roles": ["admin"],
  "enabled": true,
  "useAnalytics": false,
  "language": "en",
  "version": "1.3.2",
  "updatedBy": "orhan",
  "lastUpdatedAt": "2025-04-23T12:33:21.202Z",
  "history": [
    {
      "version": "1.3.2",
      "by": "orhan",
      "date": "2025-04-23T12:33:21.202Z",
      "note": "Meta auto-generated"
    }
  ],
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "auth": true,
      "summary": "Get all blogs"
    },
    {
      "method": "POST",
      "path": "/",
      "auth": true,
      "summary": "Create blog",
      "body": {
        "$ref": "#/definitions/BlogCreate"
      }
    }
  ]
}
```

### Feldbeschreibung

| Feld               | Beschreibung                                                                 |
|--------------------|------------------------------------------------------------------------------|
| `name`             | Modulname (Pflichtfeld)                                                      |
| `icon`             | Icon für das Admin-Panel (z. B. `"box"`)                                     |
| `visibleInSidebar` | Anzeige im Admin-Menü                                                        |
| `roles`            | Zugriffsbeschränkung für Benutzerrollen (z. B. `["admin"]`)                 |
| `enabled`          | Aktivierungsstatus                                                           |
| `useAnalytics`     | Route-bezogene Nutzungserfassung aktivieren                                  |
| `language`         | Standardinhaltsprache (`"en"`, `"de"`, `"tr"`)                               |
| `version`          | Automatisch aktualisierte Metadaten-Version                                 |
| `updatedBy`        | Letzter Bearbeiter                                                           |
| `lastUpdatedAt`    | Zeitpunkt der letzten Änderung (ISO-Format)                                  |
| `history`          | Änderungsverlauf inkl. Autor und Kommentar                                   |
| `routes`           | Liste von API-Endpunkten inkl. Authentifizierung und Beschreibung            |

---

## 🔄 Automatische Meta-Generierung

Alle `.meta.json`-Dateien werden per Script erzeugt:

```bash
bun run generate:meta
```

### Das Script übernimmt:

- Scanning aller `.routes.ts`-Dateien für Routen & Methoden
- Generierung/Update der zugehörigen `*.meta.json`-Dateien
- Synchronisation mit MongoDB via `ModuleMetaModel` und `ModuleSetting`
- Berechnung des `enabled`-Status je nach `.env.*` (`getEnvProfiles()`)
- Löscht verwaiste Meta-Dateien & zugehörige DB-Einträge automatisch

---

## 🧪 Meta-Validierung

```bash
bun run src/scripts/metaValidator.ts
```

Dieses Validierungstool prüft:

- Gültige JSON-Struktur
- Pflichtfelder vorhanden (`name`, `icon`, `routes`)
- Modulverzeichnis existiert tatsächlich?
- Modul in `.env.*` aktiv?

---

## 💾 Verbindung zur Datenbank

### 📄 `ModuleMetaModel`

Speichert zentrale Metadaten zu jedem Modul in MongoDB. Wird vom Admin-Panel geladen.

### 🔧 `ModuleSetting`

Speichert projektabhängige Einstellungen pro Modul:

```ts
{
  project: "metahub",
  module: "blog",
  enabled: true,
  visibleInSidebar: true
}
```

---

## 🔗 Integration mit Swagger

Aus den Meta-Dateien wird automatisch OpenAPI-Dokumentation generiert:

```ts
generateSwaggerSpecFromMeta()
```

- Wenn `routes[].body` vorhanden ist → Swagger `requestBody` wird eingebunden
- UI: `/api-docs`
- JSON: `/swagger.json`

---

## 🚀 Zukünftige Erweiterungen

- [x] Automatische Versionierung und Änderungsverlauf
- [x] Erkennung und Löschung verwaister Module (Datei & DB)
- [ ] Unterstützung für `formType`: `"json"` vs. `"form-data"`
- [ ] `fields` für dynamische Formular-Definitionen im Admin-UI
- [ ] Erweiterte `response`-Definitionen für Swagger
- [ ] UI-basierte Bearbeitung von Meta-Dateien im Admin-Panel

---
