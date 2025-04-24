
---

# 📘 Swagger UI Einrichtung und Nutzung (`SWAGGER_SETUP.md`)

Dieses Dokument beschreibt die Integration, Konfiguration und Nutzung von **Swagger UI** im MetaHub-Projekt.

---

## 🎯 Ziel

Swagger UI ermöglicht die automatische Dokumentation und visuelle Testbarkeit von API-Endpunkten. In MetaHub werden Swagger-Dokumente für alle aktiven Module **dynamisch über Meta-Dateien** erzeugt.

---

## 📦 Hauptdateien

| Datei | Beschreibung |
|-------|--------------|
| `generateSwaggerSpec.ts` | Generiert Swagger `paths`, `tags` und `components` aus den Meta-Dateien |
| `setupSwagger.ts` | Bindet das Swagger UI an die Express-App (`/swagger.json` und `/api-docs`) |
| `swaggerConfig.ts` | Beinhaltet zentrale Swagger-Konfigurationen (optional erweiterbar) |
| `getEnabledModules.ts` | Erkennt die aktiven Module anhand der Umgebungskonfiguration |

---

## ⚙️ Ablauf

1. Alle `meta-configs/metahub/*.meta.json` Dateien werden eingelesen  
2. Nur in `.env.<env>` aktivierte Module werden berücksichtigt  
3. Für jede Route:
   - `method`, `path`, `auth`, `summary` werden übernommen  
   - Optional: `body`-Schema im JSON-Schema-Format  
4. Erreichbar unter `/swagger.json`  
5. Visuelles Interface verfügbar unter `/api-docs`  

---

## ✅ Integration

### 1. In der Express-Anwendung

```ts
import express from "express";
import { setupSwagger } from "@/core/swagger/setupSwagger";

const app = express();
await setupSwagger(app);
```

### 2. Sichtbare Schnittstellen

| URL | Beschreibung |
|-----|--------------|
| `/swagger.json` | Rohes Swagger JSON |
| `/api-docs`     | Swagger UI Interface |

---

## 🌍 Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `APP_ENV` | Bestimmt welche `.env.*` Datei geladen wird (z. B. `metahub`, `kuhlturm`) |
| `PORT`    | Wird in der Swagger-URL verwendet |
| `HOST`    | Wird in der Swagger-URL verwendet |
| `SWAGGER_BASE_URL` | Adresse des Swagger-Servers (Standard: `http://localhost:5014/api`) |

---

## 🧠 Erweiterte Funktionen

- `generateSwaggerSpecFromMeta()` erzeugt Swagger zur Laufzeit  
- Bei `auth: true` wird automatisch `security: bearerAuth` gesetzt  
- Wenn `body` vorhanden ist, wird ein `requestBody` für Swagger erstellt  
- `pathPrefix` kann genutzt werden, um Routen gruppiert darzustellen  

---

## 🚧 Offene Punkte / Verbesserungen

- [ ] Unterstützung und Beschreibung für `form-data` Uploads  
- [ ] Detaillierte `responses`-Schemas hinzufügen  
- [ ] Zentrale Sammlung aller Schemas unter `definitions`  
- [ ] Anzeige der Swagger-Links im Admin-Panel  

---
