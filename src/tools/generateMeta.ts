import fs from "fs";
import path from "path";
import { directRouteRegex, chainedRouteRegex } from "../core/utils/regex";
import { zodToJsonSchema } from "zod-to-json-schema";

// 🗂️ Klasör yolları
const modulesPath = path.join(__dirname, "../modules");
const outputMetaDir = path.join(__dirname, "../meta-configs/metahub");

if (!fs.existsSync(outputMetaDir)) fs.mkdirSync(outputMetaDir, { recursive: true });

type RouteMeta = {
  method: string;
  path: string;
  auth: boolean;
  summary: string;
  body?: any; // opsiyonel body schema
};

// 🚏 Routes'ları JS dosyasından çıkar
const extractRoutesFromFile = (filePath: string): RouteMeta[] => {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const routes: RouteMeta[] = [];

  // router.get("/example")
  let match: RegExpExecArray | null;
  while ((match = directRouteRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      auth: content.includes("authenticate"),
      summary: `${match[1].toUpperCase()} ${match[2]}`,
    });
  }

  // router.route("/example").post().put()
  while ((match = chainedRouteRegex.exec(content)) !== null) {
    const routePath = match[1];
    const methodsBlock = match[2];
    const methodMatches = [...methodsBlock.matchAll(/\.(get|post|put|delete|patch)\(/g)];

    for (const m of methodMatches) {
      routes.push({
        method: m[1].toUpperCase(),
        path: routePath,
        auth: content.includes("authenticate"),
        summary: `${m[1].toUpperCase()} ${routePath}`,
      });
    }
  }

  return routes;
};

// 🧩 Meta yapısı oluştur
const defaultMeta = (moduleName: string, routes: RouteMeta[]) => ({
  name: moduleName,
  label: {
    en: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
    de: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
    tr: moduleName.charAt(0).toUpperCase() + moduleName.slice(1),
  },
  description: {
    en: `Manage ${moduleName}`,
    de: `${moduleName} verwalten`,
    tr: `${moduleName} yönet`,
  },
  icon: "box",
  visibleInSidebar: true,
  roles: ["admin"],
  enabled: true,
  useAnalytics: false,
  routes,
});

// 🛠️ index.ts oluşturucu
const generateIndexTs = (mod: string) => `import express from "express";
import routes from "./${mod}.routes";

const router = express.Router();
router.use("/", routes);

export * from "./${mod}.controller";
export * from "./${mod}.models";

export default router;
`;

// 🔁 Her modül için meta oluştur
fs.readdirSync(modulesPath).forEach(async (mod) => {
  const modPath = path.join(modulesPath, mod);
  if (fs.statSync(modPath).isDirectory()) {
    const routeFile = path.join(modPath, `${mod}.routes.ts`);
    const controllerFile = path.join(modPath, `${mod}.controller.ts`);
    const modelFile = path.join(modPath, `${mod}.models.ts`);

    if (fs.existsSync(routeFile) && fs.existsSync(controllerFile) && fs.existsSync(modelFile)) {
      const indexFilePath = path.join(modPath, "index.ts");
      fs.writeFileSync(indexFilePath, generateIndexTs(mod), "utf8");
    }

    let routes = extractRoutesFromFile(routeFile);

    // 👇 Sadece "blog" için Zod schema ekle
    if (mod === "blog") {
      try {
        const { BlogCreateSchema } = await import(`../modules/blog/blog.validation`);
        const bodySchema = zodToJsonSchema(BlogCreateSchema, "BlogCreate");

        // POST /api/blog için body schema ekle
        routes = routes.map((route) => {
          if (route.method === "POST" && route.path === "/") {
            return {
              ...route,
              body: bodySchema,
            };
          }
          return route;
        });
      } catch (err) {
        console.error("❌ Failed to import Zod schema for blog:", err);
      }
    }

    const meta = defaultMeta(mod, routes);
    const outputMetaPath = path.join(outputMetaDir, `${mod}.meta.json`);
    fs.writeFileSync(outputMetaPath, JSON.stringify(meta, null, 2), "utf8");
  }
});
