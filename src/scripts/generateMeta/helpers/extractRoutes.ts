import fs from "fs";
import path from "path";
import {
  DIRECT_ROUTE_REGEX,
  CHAINED_ROUTE_REGEX,
} from "@/scripts/generateMeta/helpers/constants";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// Route meta tip tanımı
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

/**
 * Bir dosyadan route'ları çıkartır (tenant-aware, debug loglu)
 */
export const extractRoutesFromFile = (
  filePath: string,
  tenant: string
): RouteMeta[] => {
  const lang: SupportedLocale = getLogLocale();

  if (!fs.existsSync(filePath)) {
    logger.warn(
      t("meta.route.fileNotFound", lang, translations, { filePath, tenant }),
      {
        tenant,
        module: "meta",
        event: "meta.route.fileNotFound",
        status: "notfound",
        filePath,
      }
    );
    return [];
  }

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf-8");
    logger.debug(
      `[extractRoutesFromFile] Okunan dosya: ${filePath} (${content.length} karakter)`,
      {
        tenant,
        module: "meta",
        event: "meta.route.readFile",
        status: "debug",
        filePath,
      }
    );
  } catch (err) {
    logger.error(
      t("meta.route.readError", lang, translations, { filePath, tenant }) +
        " " +
        String(err),
      {
        tenant,
        module: "meta",
        event: "meta.route.readError",
        status: "fail",
        filePath,
        error: err,
      }
    );
    return [];
  }

  const routes: RouteMeta[] = [];
  let directCount = 0,
    chainedCount = 0;
  let match: RegExpExecArray | null;

  // Direkt tanımlar
  while ((match = DIRECT_ROUTE_REGEX.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];

    const afterRoute = content.slice(match.index);
    const argsMatch = afterRoute.match(/\(\s*([^,]+),\s*([^,]+)\)/);

    const validationName = argsMatch?.[1]?.trim();
    const controllerName = argsMatch?.[2]?.trim();

    logger.debug(
      `[extractRoutesFromFile][DIRECT] ${method} ${routePath} val:${validationName} ctrl:${controllerName}`,
      {
        tenant,
        module: "meta",
        event: "meta.route.directMatch",
        status: "debug",
        filePath,
      }
    );

    routes.push({
      method,
      path: routePath,
      auth: content.includes("authenticate"),
      summary: `${method} ${routePath}`,
      validationName,
      controllerName,
    });
    directCount++;
  }
  logger.debug(
    `[extractRoutesFromFile][DIRECT] Toplam bulundu: ${directCount} (${filePath})`,
    {
      tenant,
      module: "meta",
      event: "meta.route.directCount",
      status: "debug",
      filePath,
    }
  );

  // Chained tanımlar
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

      logger.debug(
        `[extractRoutesFromFile][CHAINED] ${method} ${routePath} val:${validationName} ctrl:${controllerName}`,
        {
          tenant,
          module: "meta",
          event: "meta.route.chainedMatch",
          status: "debug",
          filePath,
        }
      );

      routes.push({
        method,
        path: routePath,
        auth: content.includes("authenticate"),
        summary: `${method} ${routePath}`,
        validationName,
        controllerName,
      });
      chainedCount++;
    }
  }
  logger.debug(
    `[extractRoutesFromFile][CHAINED] Toplam bulundu: ${chainedCount} (${filePath})`,
    {
      tenant,
      module: "meta",
      event: "meta.route.chainedCount",
      status: "debug",
      filePath,
    }
  );

  logger.debug(
    `[extractRoutesFromFile] >>> ${routes.length} route bulundu. Dosya: ${filePath}`,
    {
      tenant,
      module: "meta",
      event: "meta.route.count",
      status: "debug",
      filePath,
    }
  );

  return routes;
};

/**
 * Modül klasöründen tüm route dosyalarını bulur (debug loglu)
 */
export const getAllRouteFiles = (modPath: string, tenant: string): string[] => {
  const lang: SupportedLocale = getLogLocale();
  try {
    const files = fs
      .readdirSync(modPath)
      .filter((f) => f.endsWith(".routes.ts") || f === "routes.ts")
      .map((f) => path.join(modPath, f));

    logger.debug(
      `[getAllRouteFiles] Route dosyaları: ${files.length} adet: ${files.join(
        ", "
      )}`,
      {
        tenant,
        module: "meta",
        event: "meta.route.filesFound",
        status: "debug",
        modPath,
      }
    );

    if (files.length === 0) {
      logger.warn(
        t("meta.route.noRouteFiles", lang, translations, { modPath, tenant }),
        {
          tenant,
          module: "meta",
          event: "meta.route.noRouteFiles",
          status: "notfound",
          modPath,
        }
      );
    }

    return files;
  } catch (err) {
    logger.error(
      t("meta.route.dirReadError", lang, translations, { modPath, tenant }) +
        " " +
        String(err),
      {
        tenant,
        module: "meta",
        event: "meta.route.dirReadError",
        status: "fail",
        modPath,
        error: err,
      }
    );
    return [];
  }
};
