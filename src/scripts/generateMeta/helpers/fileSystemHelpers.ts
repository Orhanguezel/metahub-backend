// src/scripts/generateMeta/utils/fileSystemHelpers.ts

import fs from "fs";
import path from "path";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/scripts/generateMeta/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";

// Log ve i18n için her fonksiyonda aynı locale kullanılacak!
function getLang(): SupportedLocale {
  return getLogLocale();
}

export function ensureDirectoryExists(dirPath: string) {
  const lang = getLang();
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(t("meta.fs.dirCreated", lang, translations, { dirPath }));
    } catch (err) {
      logger.error(
        t("meta.fs.dirCreateError", lang, translations, { dirPath }) +
          " " +
          String(err)
      );
    }
  }
}

export function readJsonFile(filePath: string): any {
  const lang = getLang();
  if (!fs.existsSync(filePath)) {
    logger.warn(t("meta.fs.fileNotFound", lang, translations, { filePath }));
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    logger.error(
      t("meta.fs.fileReadError", lang, translations, { filePath }) +
        " " +
        String(err)
    );
    return null;
  }
}

export function writeJsonFile(filePath: string, data: any): void {
  const lang = getLang();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    logger.info(t("meta.fs.fileWritten", lang, translations, { filePath }));
  } catch (err) {
    logger.error(
      t("meta.fs.fileWriteError", lang, translations, { filePath }) +
        " " +
        String(err)
    );
  }
}

export function deleteFileIfExists(filePath: string): void {
  const lang = getLang();
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      logger.info(t("meta.fs.fileDeleted", lang, translations, { filePath }));
    } catch (err) {
      logger.error(
        t("meta.fs.fileDeleteError", lang, translations, { filePath }) +
          " " +
          String(err)
      );
    }
  }
}

export function getDirectories(basePath: string): string[] {
  const lang = getLang();
  try {
    return fs
      .readdirSync(basePath)
      .filter((dir) => fs.statSync(path.join(basePath, dir)).isDirectory());
  } catch (err) {
    logger.error(
      t("meta.fs.dirReadError", lang, translations, { basePath }) +
        " " +
        String(err)
    );
    return [];
  }
}

export function getFilesByExtension(
  basePath: string,
  extension: string
): string[] {
  const lang = getLang();
  try {
    return fs.readdirSync(basePath).filter((file) => file.endsWith(extension));
  } catch (err) {
    logger.error(
      t("meta.fs.dirReadError", lang, translations, { basePath }) +
        " " +
        String(err)
    );
    return [];
  }
}
