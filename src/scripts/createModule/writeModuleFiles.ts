// src/tools/createModule/writeModuleFiles.ts

import fs from "fs";
import path from "path";
import {
  getControllerContent,
  getRoutesContent,
  getValidationContent,
  getModelContent,
  getIndexContent,
  getTestContent,
  capitalize
} from "./fileTemplates";

export const writeModuleFiles = (basePath: string, moduleName: string) => {
  const CapName = capitalize(moduleName);

  const files = {
    [`${moduleName}.controller.ts`]: getControllerContent(CapName),
    [`${moduleName}.routes.ts`]: getRoutesContent(moduleName, CapName),
    [`${moduleName}.validation.ts`]: getValidationContent(CapName),
    [`${moduleName}.models.ts`]: getModelContent(CapName),
    [`index.ts`]: getIndexContent(moduleName),
  };

  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(basePath, filename), content);
  }

  const testPath = path.join(basePath, "__tests__");
  fs.mkdirSync(testPath, { recursive: true });
  fs.writeFileSync(path.join(testPath, `${moduleName}.controller.spec.ts`), getTestContent(CapName, moduleName));
};
