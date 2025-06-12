import fs from "fs";
import path from "path";
import { DIRECT_ROUTE_REGEX, CHAINED_ROUTE_REGEX } from "./constants";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

export type RouteMeta = {
  method: string;
  path: string;
  auth: boolean;
  summary: string;
  pathPrefix?: string;
  body?: any;
  validationName?: string;
  controllerName?: string;
};

export const extractRoutesFromFile = (filePath: string): RouteMeta[] => {
  const lang = getLogLocale();

  if (!fs.existsSync(filePath)) {
    logger.warn(t("meta.route.fileNotFound", lang, translations, { filePath }));
    return [];
  }

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    logger.error(
      t("meta.route.readError", lang, translations, { filePath }) +
        " " +
        String(err)
    );
    return [];
  }

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
    const methodMatches = [
      ...methodsBlock.matchAll(
        /\.(get|post|put|delete|patch)\(([^,]+),\s*([^,]+)\)/g
      ),
    ];

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
  const lang = getLogLocale();
  try {
    return fs
      .readdirSync(modPath)
      .filter((f) => f.endsWith(".routes.ts") || f === "routes.ts")
      .map((f) => path.join(modPath, f));
  } catch (err) {
    logger.error(
      t("meta.route.dirReadError", lang, translations, { modPath }) +
        " " +
        String(err)
    );
    return [];
  }
};
