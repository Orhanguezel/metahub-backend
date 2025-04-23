
```markdown
# 📦 MetaHub Backend

MetaHub ist ein modulares und skalierbares Backend-System auf Basis von Node.js + Express.js. Das Projekt ist in TypeScript geschrieben und wird durch moderne Technologien wie Zod, Swagger und MongoDB unterstützt.

## 📁 Projektstruktur

```
metahub-backend/
├── src/
│   ├── core/               # Zentrale Konfigurationen, Middleware, Hilfsfunktionen
│   │   ├── config/         # .env-Loader, MongoDB-Verbindung, JWT-Einstellungen
│   │   ├── middleware/     # Locale, Authentifizierung, Fehlerbehandlung
│   │   ├── swagger/        # Swagger-Setup und Generierung aus Meta-Daten
│   │   └── utils/          # Regex, Zod-Schemas, Hilfsfunktionen
│   ├── modules/            # Alle modularen Features befinden sich hier
│   │   └── blog/           # Beispielmodul: blog.controller.ts, blog.routes.ts, blog.models.ts
│   ├── meta-configs/       # Automatisch generierte Meta-Dateien (.meta.json)
│   └── server.ts           # Hauptanwendung mit Express
├── .env.metahub            # Umgebungsvariablen
├── package.json
└── tsconfig.json
```

## 🚀 Start

```bash
bun install
bun run dev
```

## 🔌 Umgebungsvariablen

Beispiel für `.env.metahub`:

```env
PORT=5014
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

ACTIVE_META_PROFILE=metahub
META_CONFIG_PATH=src/meta-configs/metahub
ENABLED_MODULES=blog,product,order,...
PROJECT_NAME=MetaHub
SWAGGER_ROUTE=/api-docs
SWAGGER_BASE_URL=http://localhost:5014/api
```

## 🧩 Modulare Struktur

Jedes Modul liegt unter `modules/` und enthält folgende Dateien:

- `modulename.controller.ts`
- `modulename.routes.ts`
- `modulename.models.ts`

Wenn alle drei existieren, wird automatisch eine `index.ts`-Datei generiert.

## 🧠 Meta-System

- Mit dem Script `generateMeta.ts` wird für jedes Modul eine `.meta.json` erzeugt.
- Swagger verwendet diese Metadaten zur automatischen Dokumentation.

```bash
bun run generate:meta
```

## 🧾 Swagger UI

Alle API-Endpunkte können über Swagger getestet werden:

📘 Swagger UI: [http://localhost:5014/api-docs](http://localhost:5014/api-docs)

## 🔐 Authentifizierung

- JWT-basierte Authentifizierung
- `authenticate` Middleware ist in geschützten Routen erforderlich
- Im Swagger-UI kann ein Token über die Schaltfläche `Authorize` getestet werden

## 🧪 Testing & Entwicklung

- API-Tests über Swagger
- Optional: Postman Collection
- Zod-Schema-Validierung (in Vorbereitung)

## 👥 Teamorientierte Entwicklung

- Auch bei steigender Anzahl an Modulen bleibt das Projekt übersichtlich
- Swagger aktualisiert sich automatisch
- Dank des Meta-Systems ist die API-Übersicht für Frontend-Teams jederzeit zugänglich

---

> Für Fragen oder Beiträge: [orhanguzell@gmail.com](mailto:orhanguzell@gmail.com)
```
