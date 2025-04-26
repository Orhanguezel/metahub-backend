// src/scripts/generateMeta.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { execSync } from "child_process";
import { zodToJsonSchema } from "zod-to-json-schema";
import { directRouteRegex, chainedRouteRegex } from "../core/utils/regex";
import { getEnvProfiles } from "./getEnvProfiles";
import connectDB from "../core/config/connect";
import {
  ModuleMeta as ModuleMetaType,
  ModuleMetaModel,
  ModuleSetting,
} from "../modules/admin";

type RouteMeta = {
  method: string;
  path: string;
  auth: boolean;
  summary: string;
  pathPrefix?: string;
  body?: any;
};

type MetaHistoryEntry = {
  version: string;
  by: string;
  date: string;
  note: string;
};

function bumpPatchVersion(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "1.0.0";
  parts[2]++;
  return parts.join(".");
}

function getGitUser(): string {
  try {
    return execSync("git config user.name").toString().trim();
  } catch {
    console.warn("⚠️ Git user.name not found");
    return "unknown";
  }
}

export function updateMetaVersionLog(meta: any, note = "Meta auto-generated"): any {
  const now = new Date().toISOString();
  const oldVersion = meta.version || "1.0.0";
  const newVersion = bumpPatchVersion(oldVersion);
  const gitUser = getGitUser();

  const history: MetaHistoryEntry[] = Array.isArray(meta.history) ? meta.history : [];

  const alreadyLogged = history.some(entry => entry.version === newVersion && entry.note === note);
  if (!alreadyLogged) {
    history.push({
      version: newVersion,
      by: gitUser,
      date: now,
      note,
    });
  }

  return {
    ...meta,
    version: newVersion,
    updatedBy: gitUser,
    lastUpdatedAt: now,
    history,
  };
}

const extractRoutesFromFile = (filePath: string): RouteMeta[] => {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const routes: RouteMeta[] = [];
  let match: RegExpExecArray | null;

  while ((match = directRouteRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      auth: content.includes("authenticate"),
      summary: `${match[1].toUpperCase()} ${match[2]}`,
    });
  }

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

const getAllRouteFiles = (modPath: string): string[] => {
  return fs.readdirSync(modPath)
    .filter((f) => f.endsWith(".routes.ts"))
    .map((f) => path.join(modPath, f));
};

const generate = async () => {
  await connectDB();
  const modulesPath = path.join(__dirname, "../modules");
  const metaProjectDir = path.join(__dirname, "../meta-configs/metahub");

  if (!fs.existsSync(metaProjectDir)) fs.mkdirSync(metaProjectDir, { recursive: true });

  const allModules = fs.readdirSync(modulesPath).filter((mod) => fs.statSync(path.join(modulesPath, mod)).isDirectory());
  const existingMetaFiles = fs.readdirSync(metaProjectDir).filter((f) => f.endsWith(".meta.json"));
  const modulesInFs = new Set(allModules);

  for (const file of existingMetaFiles) {
    const modName = file.replace(".meta.json", "");
    if (!modulesInFs.has(modName)) {
      console.warn(`🗑️ Orphan meta found: ${modName}`);
      try {
        fs.unlinkSync(path.join(metaProjectDir, file));
        console.log(`🧹 Deleted meta file: ${file}`);
      } catch (err) {
        console.error(`❌ Failed to delete meta file for ${modName}:`, err);
      }
      try {
        await ModuleMetaModel.deleteOne({ name: modName });
        await ModuleSetting.deleteMany({ module: modName });
        console.log(`🧹 Deleted DB records for module: ${modName}`);
      } catch (err) {
        console.error(`❌ Failed to delete DB records for ${modName}:`, err);
      }
    }
  }

  for (const mod of allModules) {
    const modPath = path.join(modulesPath, mod);
    const routeFiles = getAllRouteFiles(modPath);

    if (routeFiles.length === 0) {
      console.warn(`⚠️ Skipped module: ${mod} (no .routes.ts files found)`);
      continue;
    }

    const metaPath = path.join(metaProjectDir, `${mod}.meta.json`);
    let existing = {};
    try {
      if (fs.existsSync(metaPath)) existing = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    } catch (err) {
      console.error(`❌ Failed to read meta for ${mod}:`, err);
    }

    let routes: RouteMeta[] = [];
    for (const routeFile of routeFiles) {
      const fileRoutes = extractRoutesFromFile(routeFile);
      const filename = path.basename(routeFile).replace(".routes.ts", "");
      const prefix = filename.replace(mod, "").replace(/^[A-Z]/, (m) => m.toLowerCase());

      routes.push(...fileRoutes.map((route) => ({ ...route, pathPrefix: prefix || undefined })));
    }

    if (mod === "blog") {
      try {
        const { BlogCreateSchema } = await import(`../modules/blog/blog.validation`);
        const bodySchema = zodToJsonSchema(BlogCreateSchema, "BlogCreate");
        routes = routes.map((route) =>
          route.method === "POST" && route.path === "/"
            ? { ...route, body: bodySchema }
            : route
        );
      } catch (err) {
        console.error(`❌ Failed to load validation for blog:`, err);
      }
    }

    const meta: ModuleMetaType = updateMetaVersionLog({
      name: mod,
      icon: (existing as any).icon || "box",
      roles: (existing as any).roles || ["admin"],
      useAnalytics: (existing as any).useAnalytics ?? false,
      language: (existing as any).language || "en",
      routes,
    });

    try {
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
    } catch (err) {
      console.error(`❌ Failed to write meta file for ${mod}:`, err);
      continue;
    }

    try {
      await ModuleMetaModel.updateOne({ name: mod }, { $set: meta }, { upsert: true });
    } catch (err) {
      console.error(`❌ DB update failed for ${mod}:`, err);
    }

    for (const profile of getEnvProfiles()) {
      const envPath = path.resolve(process.cwd(), `.env.${profile}`);
      if (!fs.existsSync(envPath)) continue;

      const parsed = dotenv.parse(fs.readFileSync(envPath));
      const enabledModules = parsed.ENABLED_MODULES?.split(",").map((m) => m.trim()) || [];
      const isEnabled = enabledModules.includes(mod);

      try {
        await ModuleSetting.updateOne(
          { project: profile, module: mod },
          { $set: { enabled: isEnabled, visibleInSidebar: true } },
          { upsert: true }
        );
      } catch (err) {
        console.error(`❌ DB setting update failed for ${mod} (${profile}):`, err);
      }
    }

    console.log(`✅ Meta generated for: ${mod}`);
  }

  mongoose.connection.close();
};

generate().catch((err) => {
  console.error("❌ Meta generation failed:", err);
  mongoose.connection.close();
});