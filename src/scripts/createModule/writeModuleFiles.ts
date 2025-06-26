import fs from "fs";
import path from "path";
import { getControllerContent } from "./template/getControllerContent";
import { getRoutesContent } from "./template/getRoutesContent";
import { getValidationContent } from "./template/getValidationContent";
import { getModelContent } from "./template/getModelContent";
import { getIndexContent } from "./template/getIndexContent";
import { getTestContent } from "./template/getTestContent";
import { getI18nIndexContent } from "./template/getI18nIndexContent";
import { capitalize } from "./template/capitalize";
/**
 * Automatically generate module boilerplate files:
 * Controller, Routes, Validation, Model, Index, Tests, i18n files.
 * Fully multi-tenant and i18n ready.
 */
export const writeModuleFiles = (basePath: string, moduleName: string) => {
  const CapName = capitalize(moduleName);

  // Main module files
  const files = {
    [`${moduleName}.controller.ts`]: getControllerContent(CapName, moduleName),
    [`${moduleName}.routes.ts`]: getRoutesContent(moduleName, CapName),
    [`${moduleName}.validation.ts`]: getValidationContent(CapName, moduleName),
    [`${moduleName}.model.ts`]: getModelContent(CapName),
    [`index.ts`]: getIndexContent(moduleName, CapName),
  };

  // Write module files
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(basePath, filename);
    fs.writeFileSync(filePath, content.trimStart());
  }

  // Test folder and test file
  const testPath = path.join(basePath, "__tests__");
  if (!fs.existsSync(testPath)) {
    fs.mkdirSync(testPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(testPath, `${moduleName}.controller.spec.ts`),
    getTestContent(CapName, moduleName).trimStart()
  );

  // i18n folder and index + translation files
  const i18nPath = path.join(basePath, "i18n");
  if (!fs.existsSync(i18nPath)) {
    fs.mkdirSync(i18nPath, { recursive: true });
  }
  // i18n index.ts file (standard)
  fs.writeFileSync(
    path.join(i18nPath, "index.ts"),
    getI18nIndexContent().trimStart()
  );
  // Example translation files (add more as needed)
  fs.writeFileSync(
    path.join(i18nPath, "en.json"),
    JSON.stringify(
      {
        create: {
          success: "Created successfully!",
          fail: "Create failed.",
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(i18nPath, "tr.json"),
    JSON.stringify(
      {
        create: {
          success: "Başarıyla eklendi!",
          fail: "Eklenemedi.",
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(i18nPath, "de.json"),
    JSON.stringify(
      {
        create: {
          success: "Erfolgreich erstellt!",
          fail: "Erstellung fehlgeschlagen.",
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(i18nPath, "pl.json"),
    JSON.stringify(
      {
        create: {
          success: "Utworzono pomyślnie!",
          fail: "Tworzenie nie powiodło się.",
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(i18nPath, "fr.json"),
    JSON.stringify(
      {
        create: {
          success: "Créé avec succès !",
          fail: "Échec de la création.",
        },
      },
      null,
      2
    )
  );

  // Optionally: add a type file, documentation, etc.

  // Info log (optional)
  console.log(`✅ Module files for "${moduleName}" created in: ${basePath}`);
};
