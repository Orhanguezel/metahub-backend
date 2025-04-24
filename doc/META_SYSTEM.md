
---

# 🧠 Meta-System – MetaHub Backend

Dieses Dokument erklärt, wie die Struktur `meta-configs/` im **MetaHub Backend** funktioniert und welche Rolle die `meta.json`-Dateien im System spielen.

---

## 🎯 Ziel

Das Meta-System definiert die technischen Eigenschaften jedes Moduls und wird verwendet, um:

- Swagger-Dokumentation zu generieren,
- Die Sichtbarkeit von Modulen im Admin-Panel zu steuern,
- Eine zentrale Struktur für Versionierung und Einstellungen bereitzustellen.

---

## 🗂️ Verzeichnisstruktur

Für jedes Projekt gibt es ein separates `meta-config`-Verzeichnis:

```
meta-configs/
└── metahub/
    ├── blog.meta.json
    ├── cart.meta.json
    └── ...
```

Jede `.meta.json`-Datei repräsentiert ein einzelnes Modul.

---

## 🧬 Struktur einer Meta-Datei

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
      "summary": "Create new blog",
      "body": { "$ref": "#/definitions/BlogCreate" }
    }
  ]
}
```

### Feldbeschreibung

| Feld               | Beschreibung                                                                 |
|--------------------|------------------------------------------------------------------------------|
| `name`             | Modulname (erforderlich)                                                     |
| `icon`             | Icon-Name im Admin-Panel (z. B. `"box"`)                                    |
| `visibleInSidebar` | Sichtbarkeit im Admin-Menü                                                   |
| `roles`            | Rollen mit Zugriff auf das Modul (z. B. `["admin"]`)                        |
| `enabled`          | Aktivierungsstatus                                                           |
| `useAnalytics`     | Aktivieren, wenn Analyse pro Route nötig ist                                |
| `language`         | Standardsprache (`"en"`, `"de"`, `"tr"`)                                     |
| `routes`           | Swagger-Endpunkte mit `method`, `path`, `summary`, `body` usw.              |

---

## 🔄 Meta-Erstellung

Die Meta-Dateien aller Module können automatisch generiert werden:

```bash
bun run src/scripts/generateMeta.ts
```

Dieses Skript:

- Extrahiert Methoden und Pfade aus `*.routes.ts`
- Schreibt die Daten unter `meta-configs/`
- Speichert die Infos in MongoDB über `ModuleMetaModel`
- Legt das `enabled`-Feld anhand der `.env.*`-Dateien fest (`getEnvProfiles()`)

---

## 🧪 Meta-Validierung

```bash
bun run src/scripts/metaValidator.ts
```

Dieses Tool prüft:

- Ist die JSON-Struktur gültig?
- Fehlen erforderliche Felder (`name`, `icon`, `routes`)?
- Existiert der Modul-Ordner?
- Ist das Modul in `.env.*` aktiviert?

---

## 💾 Beziehung zur Datenbank

### `ModuleMetaModel` (Meta-Definition)
Speichert Meta-Informationen für jedes Modul in MongoDB. Wird vom Admin-Panel verwendet.

### `ModuleSetting` (Projektspezifische Einstellungen)
Hält projektbezogene Einstellungen für jedes Frontend-Projekt (z. B. `.env.metahub`, `.env.kuhlturm`).

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

Aus Meta-Dateien wird automatisch Swagger-Dokumentation erstellt:

```ts
generateSwaggerSpecFromMeta()
```

- Wenn `routes[].body` gesetzt ist, wird ein Swagger `requestBody` erzeugt.
- Swagger UI: `/api-docs`
- Swagger JSON: `/swagger.json`

---

## 🚀 Potenziale zur Weiterentwicklung

- [ ] `version`-Feld zur Modul-Versionierung
- [ ] `formType`: Unterstützung für `json` vs `form-data`
- [ ] `fields`: Dynamische Formularstrukturen
- [ ] Beispielhafte `response`-Blöcke für Swagger
- [ ] UI zur Meta-Aktualisierung im Admin-Panel

---
