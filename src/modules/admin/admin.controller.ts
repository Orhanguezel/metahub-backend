import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { ModuleMeta } from "@/modules/admin";
import { ModuleSetting } from "@/modules/admin";
import { updateMetaVersionLog } from "@/scripts/generateMeta/utils/versionHelpers";
import { getGitUser, getGitCommitHash } from "@/scripts/generateMeta/utils/gitHelpers";
import { writeModuleFiles } from "@/scripts/createModule/writeModuleFiles";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const PROJECT_ENV = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || "ensotek";

export const createModule = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      statsKey = ""
    } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: "Module name is required." });
      return;
    }

    const existing = await ModuleMeta.findOne({ name });
    if (existing) {
      res.status(400).json({ success: false, message: "Module already exists." });
      return;
    }

    const username = await getGitUser();
    const commitHash = await getGitCommitHash();
    const now = new Date().toISOString();

    const finalLabel = label?.tr && label?.en && label?.de
      ? label
      : { tr: capitalize(name), en: capitalize(name), de: capitalize(name) };

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

    const metaDir = path.resolve(process.cwd(), "src/meta-configs", PROJECT_ENV);
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }
    const metaPath = path.join(metaDir, `${name}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(metaContent, null, 2));

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
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Get all modules (with optional project filter)
export const getModules = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
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
    const modules = await ModuleMeta.find({ name: { $in: moduleNames } }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Modules fetched successfully.",
      data: modules,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Get single module by name
export const getModuleByName = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params;

    const module = await ModuleMeta.findOne({ name });

    if (!module) {
      res.status(404).json({ success: false, message: "Module not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Module fetched successfully.",
      data: module,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Update module
export const updateModule = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params;
    const updates = req.body;

    const updated = await ModuleMeta.findOneAndUpdate(
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
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Delete module
export const deleteModule = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params;

    const deleted = await ModuleMeta.findOneAndDelete({ name });

    if (!deleted) {
      res.status(404).json({ success: false, message: "Module not found or already deleted." });
      return;
    }

    const metaPath = path.resolve(process.cwd(), "src/meta-configs", PROJECT_ENV, `${name}.meta.json`);
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    res.status(200).json({
      success: true,
      message: "Module deleted successfully.",
    });
    return;
  } catch (error) {
    next(error);
  }
});
// ✅ Get distinct projects
export const getProjects = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const distinctProjects = await ModuleSetting.distinct("project");
    const projects = distinctProjects.length > 0 ? distinctProjects : ["ensotek"];

    res.status(200).json({
      success: true,
      message: "Projects fetched successfully.",
      data: projects,
    });
    return;
  } catch (error) {
    next(error);
  }
});

// ✅ Get analytics for all modules (dashboard view)
export const getModuleAnalytics = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const modules = await ModuleMeta.find({ showInDashboard: true }).sort({ order: 1 });

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
          count: 0,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Module analytics fetched successfully.",
      data: analyticsData,
    });
    return;
  } catch (error) {
    next(error);
  }
});
