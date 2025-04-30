import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ModuleMetaModel from "./moduleMeta.model";
import ModuleSetting from "./moduleSettings.model";
import { updateMetaVersionLog } from "@/scripts/generateMeta/utils/versionHelpers";
import { getGitUser, getGitCommitHash } from "@/scripts/generateMeta/utils/gitHelpers";
import { getEnvProfiles } from "@/tools/getEnvProfiles";
import { writeModuleFiles } from "@/scripts/createModule/writeModuleFiles";

// 🔥 Helper
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// ➕ Create Module
export const createModule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    statsKey = ""
  } = req.body;

  if (!name) {
    res.status(400).json({ success: false, message: "Module name is required." });
    return;
  }

  const existing = await ModuleMetaModel.findOne({ name });
  if (existing) {
    res.status(400).json({ success: false, message: "Module already exists." });
    return;
  }

  const username = await getGitUser();
  const commitHash = await getGitCommitHash();
  const now = new Date().toISOString();

  const finalLabel = label?.tr && label?.en && label?.de
    ? label
    : {
        tr: capitalize(name),
        en: capitalize(name),
        de: capitalize(name),
      };

  // ➡️ 1- Meta dosyasını oluştur
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
    showInDashboard,  // ✅
    order,             // ✅
    statsKey,          // ✅
  });

  const metaPath = path.resolve(process.cwd(), "src/meta-configs/metahub", `${name}.meta.json`);
  fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));

  // ➡️ 2- Database kayıtları oluştur
  await ModuleMetaModel.create(metaContent);
  await ModuleSetting.create({
    project: process.env.APP_ENV || "metahub",
    module: name,
    enabled,
    visibleInSidebar,
    useAnalytics,
    roles,
    icon,
    label: finalLabel,
  });

  // ➡️ 3- Modül klasörünü ve dosyaları oluştur
  const moduleDir = path.resolve(process.cwd(), "src/modules", name);
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
  }

  await writeModuleFiles(moduleDir, name);

  res.status(201).json({
    success: true,
    message: "Module created successfully.",
    data: metaContent,
  });
});

// 📄 Get All Modules
export const getModules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const project = req.query.project as string | undefined;

  if (!project) {
    res.status(400).json({ success: false, message: "Project query parameter is required." });
    return;
  }

  const settings = await ModuleSetting.find({ project });

  if (!settings || settings.length === 0) {
    res.status(200).json({ success: true, message: "No modules found for this project.", data: [] });
    return;
  }

  const moduleNames = settings.map((s) => s.module);

  const modules = await ModuleMetaModel.find({ name: { $in: moduleNames } }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    message: "Modules fetched successfully.",
    data: modules,
  });
});

// 📄 Get Single Module
export const getModuleByName = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params;

  const module = await ModuleMetaModel.findOne({ name });

  if (!module) {
    res.status(404).json({ success: false, message: "Module not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Module fetched successfully.",
    data: module,
  });
});

// ✏️ Update Module
export const updateModule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params;
  const updates = req.body;

  const updated = await ModuleMetaModel.findOneAndUpdate(
    { name },
    { $set: updates },
    { new: true }
  );

  if (!updated) {
    res.status(404).json({ success: false, message: "Module not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Module updated successfully.",
    data: updated,
  });
});

// 🗑️ Delete Module
export const deleteModule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params;

  const deleted = await ModuleMetaModel.findOneAndDelete({ name });

  if (!deleted) {
    res.status(404).json({ success: false, message: "Module not found or already deleted." });
    return;
  }

  const metaPath = path.resolve(process.cwd(), "src/meta-configs/metahub", `${name}.meta.json`);
  if (fs.existsSync(metaPath)) {
    fs.unlinkSync(metaPath);
  }

  res.status(200).json({
    success: true,
    message: "Module deleted successfully.",
  });
});

// 🎯 GET /admin/projects
export const getProjects = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const distinctProjects = await ModuleSetting.distinct("project"); 

  const projects = distinctProjects.length > 0 ? distinctProjects : ["metahub"];

  res.status(200).json({
    success: true,
    message: "Projects fetched successfully.",
    data: projects,
  });
});


/// 📈 Get Analytics for All Modules
export const getModuleAnalytics = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const modules = await ModuleMetaModel.find({ showInDashboard: true }).sort({ order: 1 });

  const analyticsData = [];

  for (const mod of modules) {
    const moduleName = mod.name.toLowerCase();
    try {
      const modelModule = await import(`@/modules/${moduleName}/${moduleName}.models`);
      const Model = modelModule.default || modelModule;

      const count = await Model.countDocuments(); 
      analyticsData.push({
        name: mod.name,
        label: mod.label,
        icon: mod.icon || "box",
        count,
      });
    } catch (err) {
      console.error(`Analytics error for module "${mod.name}":`, err);
      analyticsData.push({
        name: mod.name,
        label: mod.label,
        icon: mod.icon || "box",
        count: 0, // 👉 hata olursa 0 göster
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Module analytics fetched successfully.",
    data: analyticsData,
  });
});



