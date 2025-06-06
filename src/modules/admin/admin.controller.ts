import "@/core/config/envLoader";
import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { ModuleMeta } from "@/modules/admin";
import { ModuleSetting } from "@/modules/admin";
import { updateMetaVersionLog } from "@/scripts/generateMeta/utils/versionHelpers";
import { getGitUser, getGitCommitHash } from "@/scripts/generateMeta/utils/gitHelpers";
import { writeModuleFiles } from "@/scripts/createModule/writeModuleFiles";
import { getPaths } from "@/scripts/createModule/utils";

const PROJECT_ENV = process.env.APP_ENV;
if (!PROJECT_ENV) {
  throw new Error("❌ APP_ENV is not defined. Please set the environment before running the server.");
}

// 🔠 Label dönüşüm
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// ✅ Yeni modül oluştur
export const createModule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      icon = "box",
      roles = ["admin"],
      language = "en",
      visibleInSidebar = true,
      useAnalytics = false,
      enabled = true,
      label,
      showInDashboard = true,
      order = 0,
      statsKey = "",
    } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: "Module name is required." }); 
      return
    }

    const existing = await ModuleMeta.findOne({ name });
    if (existing) {
       res.status(400).json({ success: false, message: "Module already exists." });
       return
    }

    const username = await getGitUser();
    const commitHash = await getGitCommitHash();
    const now = new Date().toISOString();

    const finalLabel =
      label?.tr && label?.en && label?.de
        ? label
        : {
            tr: capitalize(name),
            en: capitalize(name),
            de: capitalize(name),
          };

    const metaContent = updateMetaVersionLog({
      name,
      icon,
      visibleInSidebar,
      useAnalytics,
      enabled,
      roles,
      language,
      label: finalLabel,
      routes: [],
      updatedBy: { username, commitHash },
      lastUpdatedAt: now,
      history: [],
      showInDashboard,
      order,
      statsKey,
    });

    const { metaPath, modulePath } = getPaths(name);

    // Meta klasörü oluştur ve yaz
    fs.mkdirSync(path.dirname(metaPath), { recursive: true });
    fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));

    // DB kayıtları
    await ModuleMeta.create(metaContent);
    await ModuleSetting.create({
      project: PROJECT_ENV,
      module: name,
      enabled,
      visibleInSidebar,
      useAnalytics,
      roles,
      icon,
      label: finalLabel,
    });

    // Modül klasörü oluştur
    fs.mkdirSync(modulePath, { recursive: true });
    await writeModuleFiles(modulePath, name);

    res.status(201).json({
      success: true,
      message: "Module created successfully.",
      data: metaContent,
    });
  } catch (error) {
    next(error);
  }
});


// ✅ Tüm modülleri getir (opsiyonel project query)
export const getModules = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = req.query.project as string | undefined;

    if (!project) {
       res.status(400).json({ success: false, message: "Project query parameter is required." });
       return
    }

    const settings = await ModuleSetting.find({ project });

    if (!settings || settings.length === 0) {
       res.status(200).json({ success: true, message: "No modules found for this project.", data: [] });
       return
    }

    const moduleNames = settings.map((s) => s.module);
    const modules = await ModuleMeta.find({ name: { $in: moduleNames } }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Modules fetched successfully.",
      data: modules,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Tek modül getir (by name)
export const getModuleByName = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const module = await ModuleMeta.findOne({ name });

    if (!module) {
       res.status(404).json({ success: false, message: "Module not found." });
       return
    }

    res.status(200).json({
      success: true,
      message: "Module fetched successfully.",
      data: module,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Modül güncelle
export const updateModule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    const updated = await ModuleMeta.findOneAndUpdate({ name }, { $set: updates }, { new: true });

    if (!updated) {
      res.status(404).json({ success: false, message: "Module not found." });
       return
    }

    res.status(200).json({
      success: true,
      message: "Module updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Modül sil
export const deleteModule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;

    const deleted = await ModuleMeta.findOneAndDelete({ name });

    if (!deleted) {
       res.status(404).json({ success: false, message: "Module not found or already deleted." });
       return
    }

    // Meta dosyasını sil
    const metaPath = path.resolve(process.cwd(), "src/meta-configs", PROJECT_ENV, `${name}.meta.json`);
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    res.status(200).json({
      success: true,
      message: "Module deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
});
// ✅ Mevcut projeleri getir (dinamik DEFAULT_PROJECT ile)
export const getProjects = asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const distinctProjects = await ModuleSetting.distinct("project");

    const DEFAULT_PROJECT = process.env.DEFAULT_PROJECT;
    if (!DEFAULT_PROJECT) {
      throw new Error("❌ DEFAULT_PROJECT env variable is not defined.");
    }

    const projects = distinctProjects.length > 0 ? distinctProjects : [DEFAULT_PROJECT];

    res.status(200).json({
      success: true,
      message: "Projects fetched successfully.",
      data: projects,
    });
  } catch (error) {
    next(error);
  }
});
