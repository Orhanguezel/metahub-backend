// src/scripts/generateMeta/utils/validationSchemaReader.ts

import { ValidationChain } from "express-validator";

export async function getValidationBodySchema(
  moduleName: string,
  routePath: string,
  method: string = "post" // varsayılan post
): Promise<any | null> {
  try {
    const validationModule = await import(`@/modules/${moduleName}/${moduleName}.validation`);
    const isEmptyModule = Object.keys(validationModule).length === 0;

    // Eğer tamamen boş dosya ise hiç uyarı verme
    if (isEmptyModule) {
      return null;
    }

    const matchedValidation = findMatchingValidation(validationModule, routePath);
    if (!matchedValidation) {
      // Sadece GET metotları için uyarı basma (validasyon gerekmez)
      if (method.toLowerCase() !== "get") {
        console.warn(`⚠️ No validation found for ${moduleName} ${routePath}`);
      }
      return null;
    }

    return transformExpressValidatorToJsonSchema(matchedValidation);
  } catch (err) {
    console.warn(`⚠️ Validation import failed for ${moduleName}:`, err.message);
    return null;
  }
}

function findMatchingValidation(validationModule: any, routePath: string) {
  const keys = Object.keys(validationModule);

  const normalize = (str: string) =>
    str.toLowerCase().replace(/[:/]/g, "").replace(/-/g, "");

  const normalizedRoute = normalize(routePath);

  for (const key of keys) {
    const normalizedKey = normalize(key);

    // 1️⃣ Tam eşleşme
    if (normalizedRoute === normalizedKey) {
      return validationModule[key];
    }

    // 2️⃣ Parçalı eşleşme (örn: forgotpassword vs /forgot-password)
    if (
      normalizedRoute.includes(normalizedKey) ||
      normalizedKey.includes(normalizedRoute)
    ) {
      return validationModule[key];
    }

    // 3️⃣ create / update fallback
    if (normalizedKey.includes("create") && routePath === "/") {
      return validationModule[key];
    }
    if (normalizedKey.includes("update") && routePath === "/:id") {
      return validationModule[key];
    }
  }

  return null;
}

// 🛠️ Güvenli JSON Schema çevirici
function transformExpressValidatorToJsonSchema(
  validationArray: ValidationChain[]
): any {
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
    } else if (
      validators.includes("isNumeric") ||
      validators.includes("isInt") ||
      validators.includes("isFloat")
    ) {
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
