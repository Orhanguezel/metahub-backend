import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import dotenv from "dotenv";
import { getEnabledModules } from "./getEnabledModules";

type SwaggerRoute = {
  method: string;
  path: string;
  summary?: string;
  auth?: boolean;
  requestBody?: any; // 💡 body şeması burada opsiyonel olarak eklenebilir
};

type ModuleMeta = {
  name: string;
  label?: { en?: string };
  description?: { en?: string };
  routes?: SwaggerRoute[];
};

// 🌍 Ortama özel .env dosyasını yükle
const envProfile = process.env.APP_ENV || "metahub";
const envPath = path.resolve(process.cwd(), `.env.${envProfile}`);

if (fsSync.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn(`⚠️ Swagger env file not found at: ${envPath}`);
}

export async function generateSwaggerSpecFromMeta() {
  const metaDir = path.resolve(
    process.cwd(),
    process.env.META_CONFIG_PATH || "src/meta-configs/metahub"
  );

  const enabledModules = (await getEnabledModules()).map((m) =>
    m.toLowerCase()
  );
  const paths: Record<string, any> = {};
  const tags: any[] = [];

  let metaFiles: string[];

  try {
    metaFiles = await fs.readdir(metaDir);
  } catch (err) {
    console.error(`❌ Failed to read meta directory at ${metaDir}`, err);
    return;
  }

  for (const fileName of metaFiles) {
    if (!fileName.endsWith(".meta.json")) continue;

    const moduleName = fileName.replace(/\.meta\.json$/, "").toLowerCase();

    if (!enabledModules.includes(moduleName)) {
      continue;
    }

    const metaPath = path.join(metaDir, fileName);

    try {
      const metaRaw = await fs.readFile(metaPath, "utf-8");
      const meta: ModuleMeta = JSON.parse(metaRaw);

      if (!meta.routes || meta.routes.length === 0) continue;

      tags.push({
        name: meta.label?.en || meta.name,
        description: meta.description?.en || "",
      });

      for (const route of meta.routes) {
        const fullPath = `/api/${moduleName}${route.path}`;
        const method = route.method.toLowerCase();

        if (!paths[fullPath]) paths[fullPath] = {};

        const pathSpec: any = {
          tags: [meta.name],
          summary: route.summary || "",
          security: route.auth === false ? [] : [{ bearerAuth: [] }],
          responses: {
            200: { description: "Success" },
          },
        };

        // 💡 Eğer requestBody varsa ekle
        if (route.requestBody) {
          pathSpec.requestBody = route.requestBody;
        }

        paths[fullPath][method] = pathSpec;
      }
    } catch (err) {
      console.error(`❌ Failed to parse ${moduleName}:`, err);
    }
  }

  console.log(`✅ Swagger generated for ${tags.length} modules`);

  return {
    openapi: "3.0.0",
    info: {
      title: process.env.PROJECT_NAME || "MetaHub API",
      version: "1.0.0",
      description:
        process.env.PROJECT_DESCRIPTION ||
        "API documentation for MetaHub Backend project.",
    },
    servers: [
      {
        url: process.env.SWAGGER_BASE_URL || "http://localhost:5014/api",
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
}
