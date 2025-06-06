// src/scripts/generateSwaggerSpecFromMeta.ts

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { getEnabledModules } from "./getEnabledModules";

type SwaggerRoute = {
  method: string;
  path: string;
  summary?: string;
  auth?: boolean;
  deprecated?: boolean;
  requestBody?: any;
  body?: any;
  parameters?: any[];
};

type ModuleMeta = {
  name: string;
  label?: { en?: string };
  description?: { en?: string };
  routes?: SwaggerRoute[];
};

export async function generateSwaggerSpecFromMeta(writeToDisk = false) {
  const profile = process.env.APP_ENV;
  const metaPathFromEnv = process.env.META_CONFIG_PATH;

  if (!profile) {
    throw new Error("❌ APP_ENV is not defined. Please set it before running this script.");
  }

  if (!metaPathFromEnv) {
    throw new Error("❌ META_CONFIG_PATH is not defined in environment.");
  }

  const metaDir = path.resolve(process.cwd(), metaPathFromEnv);

  if (!fsSync.existsSync(metaDir)) {
    console.error(`❌ Meta-config folder not found: ${metaDir}`);
    return undefined;
  }

  const enabledModules = (await getEnabledModules()).map((m) => m.toLowerCase());
  const paths: Record<string, any> = {};
  const tags: any[] = [];

  let metaFiles: string[];

  try {
    metaFiles = await fs.readdir(metaDir);
  } catch (err) {
    console.error(`❌ Failed to read meta directory at ${metaDir}`, err);
    return;
  }

  const availableModules = metaFiles
    .filter((file) => file.endsWith(".meta.json"))
    .map((file) => file.replace(/\.meta\.json$/, "").toLowerCase());

  for (const moduleName of enabledModules) {
    if (!availableModules.includes(moduleName)) {
      console.warn(`⚠️ Enabled module "${moduleName}" has no corresponding meta file.`);
    }
  }

  for (const fileName of metaFiles) {
    if (!fileName.endsWith(".meta.json")) continue;

    const moduleName = fileName.replace(/\.meta\.json$/, "").toLowerCase();
    if (!enabledModules.includes(moduleName)) continue;

    const metaPath = path.join(metaDir, fileName);

    try {
      const metaRaw = await fs.readFile(metaPath, "utf-8");
      const meta: ModuleMeta = JSON.parse(metaRaw);

      if (!meta.routes || meta.routes.length === 0) {
        console.warn(`⚠️ Module "${moduleName}" has no routes defined.`);
        continue;
      }

      tags.push({
        name: meta.label?.en || meta.name,
        description: meta.description?.en || "",
      });

      for (const route of meta.routes) {
        const fullPath = `/${moduleName}${route.path}`;
        const method = route.method.toLowerCase();

        if (!paths[fullPath]) paths[fullPath] = {};

        const pathSpec: any = {
          tags: [meta.name],
          summary: route.summary || "",
          deprecated: route.deprecated || false,
          security: route.auth === false ? [] : [{ bearerAuth: [] }],
          responses: {
            200: { description: "Success" },
          },
        };

        if (route.body || route.requestBody) {
          pathSpec.requestBody = {
            content: {
              "application/json": {
                schema: route.requestBody || route.body,
              },
            },
          };
        }

        if (route.parameters) {
          pathSpec.parameters = route.parameters;
        }

        paths[fullPath][method] = pathSpec;
      }
    } catch (err) {
      console.error(`❌ Failed to parse ${moduleName}:`, err);
    }
  }

  const spec = {
    openapi: "3.0.0",
    info: {
      title: process.env.PROJECT_NAME || profile + " API",
      version: "1.0.0",
      description:
        process.env.PROJECT_DESCRIPTION || `API documentation for ${profile} backend.`,
    },
    servers: [
      {
        url: process.env.SWAGGER_BASE_URL,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags,
    paths,
  };

  if (tags.length === 0) {
    console.warn("⚠️ No valid modules found for Swagger. Empty spec generated.");
  }

  if (writeToDisk) {
    const outputPath = path.join(process.cwd(), "swagger.json");
    await fs.writeFile(outputPath, JSON.stringify(spec, null, 2));
    console.log(`📄 Swagger spec written to: ${outputPath}`);
  }

  console.log(`✅ Swagger generated for ${tags.length} modules`);
  return spec;
}
