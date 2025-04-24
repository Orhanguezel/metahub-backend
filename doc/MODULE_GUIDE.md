
---

# 📦 Modulentwicklungsleitfaden – MetaHub Backend

Dieses Dokument beschreibt die Standards und Schritte zur Erstellung und Verwaltung eines neuen Backend-Moduls im MetaHub-Projekt.

---

## 🧱 Was ist ein Modul?

Ein Modul ist eine **isolierte Backend-Einheit**, die über eigene:
- Modelle (Mongoose-Schema),
- Controller (Business-Logik),
- Routen (Express-Endpunkte),
- Validierung (Zod-Schemata),
- Tests (Jest/Supertest),
- Swagger-Metadaten

verfügt und unabhängig vom restlichen System funktioniert.

---

## 📂 Modulverzeichnisstruktur

Jedes Modul befindet sich im Verzeichnis `src/modules/<modul-name>`:

```
src/modules/<modul-name>/
├── <modul>.controller.ts         // Business-Logik
├── <modul>.models.ts             // Mongoose-Modell
├── <modul>.routes.ts             // REST-Endpunkte
├── <modul>.validation.ts         // Zod-Validierung
├── index.ts                      // Exporte
└── __tests__/
    └── <modul>.controller.spec.ts // Jest-Tests
```

---

## 📎 Verwendung von `index.ts`

Alle Exporte eines Moduls erfolgen über `index.ts`:

```ts
import express from "express";
import routes from "./<modul>.routes";

const router = express.Router();
router.use("/", routes);

export * from "./<modul>.controller";
export { default as <ModulModel> } from "./<modul>.models";
export default router;
```

---

## ⚙️ Modulautomatisierung

Ein neues Modul kann mit dem CLI-Befehl erstellt werden:

```bash
bun run scripts/createModule.ts <modul-name>
```

Dieser Befehl:
- Erzeugt die Verzeichnisstruktur automatisch
- Erstellt eine Testdatei
- Generiert eine Metadatei unter `meta-configs/metahub/`

---

## 🛡️ Validierung

Jedes Modul verwendet **Zod** zur Validierung in der Datei `validation.ts`. Dadurch funktioniert die Validierung sowohl im Runtime als auch in Swagger konsistent.

```ts
export const BlogCreateSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});
```

---

## 📃 Metadaten (Swagger-Integration)

Zu jedem Modul gehört eine eigene Metadatei:

```
meta-configs/metahub/<modul>.meta.json
```

Diese Datei:
- Erzeugt Swagger-Endpunkte
- Steuert die Sichtbarkeit im Admin-Panel
- Definiert Status (`enabled`, `visibleInSidebar`)

> Die Datei kann automatisch oder manuell erstellt werden.

---

## 🔧 Umgebungsvariablen & Modulaktivierung

Ob ein Modul aktiv ist, wird über das Feld `ENABLED_MODULES` in den `.env.*`-Dateien gesteuert:

```env
ENABLED_MODULES=blog,product,faq,order
```

---

## 🧪 Tests

Für jedes Modul wird eine Jest-Testvorlage erzeugt:

```ts
describe("Product module", () => {
  it("should create a product", async () => {});
  it("should get all products", async () => {});
});
```

Testdateien befinden sich in: `__tests__/<modul>.controller.spec.ts`

---

## 🧬 Erweiterungspotential

- [ ] Unterstützung für modulinterne **Permissions** (`canCreate`, `canUpdate` etc.)
- [ ] `formSchema` zur UI-Automatisierung im Admin-Panel
- [ ] Export von Typen über `index.ts` (z. B. Interfaces)
- [ ] Beispielhafte Swagger-Antwortdaten (`responses`)
- [ ] Nutzung einer gemeinsamen `base.controller.ts` zur Code-Wiederverwendung (DRY)

---

