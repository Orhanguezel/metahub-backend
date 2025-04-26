// src/scripts/generateMeta/utils/extractRoutes.ts

import fs from "fs";
import path from "path";
import { DIRECT_ROUTE_REGEX, CHAINED_ROUTE_REGEX } from "./constants";

export type RouteMeta = {
  method: string;
  path: string;
  auth: boolean;
  summary: string;
  pathPrefix?: string;
  body?: any;
  validationName?: string; // ✅ eklendi
  controllerName?: string; // ✅ eklendi
};

export const extractRoutesFromFile = (filePath: string): RouteMeta[] => {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const routes: RouteMeta[] = [];
  let match: RegExpExecArray | null;

  while ((match = DIRECT_ROUTE_REGEX.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];

    const afterRoute = content.slice(match.index);
    const argsMatch = afterRoute.match(/\(\s*([^,]+),\s*([^,]+)\)/);

    const validationName = argsMatch?.[1]?.trim();
    const controllerName = argsMatch?.[2]?.trim();

    routes.push({
      method,
      path,
      auth: content.includes("authenticate"),
      summary: `${method} ${path}`,
      validationName,
      controllerName,
    });
  }

  while ((match = CHAINED_ROUTE_REGEX.exec(content)) !== null) {
    const routePath = match[1];
    const methodsBlock = match[2];
    const methodMatches = [...methodsBlock.matchAll(/\.(get|post|put|delete|patch)\(([^,]+),\s*([^,]+)\)/g)];

    for (const m of methodMatches) {
      const method = m[1].toUpperCase();
      const validationName = m[2]?.trim();
      const controllerName = m[3]?.trim();

      routes.push({
        method,
        path: routePath,
        auth: content.includes("authenticate"),
        summary: `${method} ${routePath}`,
        validationName,
        controllerName,
      });
    }
  }

  return routes;
};

export const getAllRouteFiles = (modPath: string): string[] => {
  return fs.readdirSync(modPath)
    .filter((f) => f.endsWith(".routes.ts"))
    .map((f) => path.join(modPath, f));
};
