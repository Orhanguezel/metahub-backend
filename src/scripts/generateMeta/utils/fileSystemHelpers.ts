// src/scripts/generateMeta/utils/fileSystemHelpers.ts

import fs from "fs";
import path from "path";

export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readJsonFile(filePath: string): any {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

export function writeJsonFile(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function deleteFileIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getDirectories(basePath: string): string[] {
  return fs.readdirSync(basePath).filter((dir) => 
    fs.statSync(path.join(basePath, dir)).isDirectory()
  );
}

export function getFilesByExtension(basePath: string, extension: string): string[] {
  return fs.readdirSync(basePath).filter((file) => file.endsWith(extension));
}
