// src/scripts/generateMeta/utils/validationSchemaReader.ts

import { ValidationChain } from "express-validator";

export async function getValidationBodySchema(moduleName: string, routePath: string): Promise<any | null> {
  try {
    const validationModule = await import(`@/modules/${moduleName}/${moduleName}.validation`);
    
    const matchedValidation = findMatchingValidation(validationModule, routePath);
    if (!matchedValidation) {
      console.warn(`⚠️ No validation found for ${moduleName} ${routePath}`);
      return null;
    }

    return transformExpressValidatorToJsonSchema(matchedValidation);
  } catch (err) {
    console.warn(`⚠️ Validation import failed for ${moduleName}:`);
    return null;
  }
}

function findMatchingValidation(validationModule: any, routePath: string) {
  const keys = Object.keys(validationModule);

  for (const key of keys) {
    if (key.toLowerCase().includes("create") && routePath === "/") {
      return validationModule[key];
    }
    if (key.toLowerCase().includes("update") && routePath === "/:id") {
      return validationModule[key];
    }
    if (key.toLowerCase().includes("keyparam") && routePath.includes(":key")) {
      return validationModule[key];
    }
  }

  return null;
}

// 🛠️ Güvenli JSON Schema çevirici
function transformExpressValidatorToJsonSchema(validationArray: ValidationChain[]): any {
  const properties: Record<string, any> = {};

  for (const rule of validationArray) {
    // @ts-ignore güvenli erişim
    const context = (rule as any)._context;

    if (!context || !context.fields || context.fields.length === 0) continue;

    const field = context.fields[0];
    if (!field) continue;

    let type = "string"; // default
    const validators = context.stack?.map((v: any) => v.validator.name) || [];

    if (validators.includes("isBoolean")) {
      type = "boolean";
    } else if (validators.includes("isNumeric") || validators.includes("isInt") || validators.includes("isFloat")) {
      type = "number";
    } else if (validators.includes("isArray")) {
      type = "array";
    }

    properties[field] = { type };
  }

  return {
    type: "object",
    properties,
  };
}


