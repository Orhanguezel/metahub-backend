import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getEnvProfiles } from "../../tools/getEnvProfiles";
import ModuleSetting from "./moduleSettings.model";

// 📥 GET /admin/modules?project=xxx
export const getAllModules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const project = req.query.project as string;

  if (!project) {
    res.status(400).json({ error: "Project param is required." });
    return;
  }

  try {
    const modules = await ModuleSetting.find({ project }).lean();

    const result = modules.map((mod) => ({
      name: mod.module,
      label: mod.label || mod.module.charAt(0).toUpperCase() + mod.module.slice(1),
      enabled: mod.enabled,
      icon: mod.icon,
      language: mod.language,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("❌ getAllModules error:", error);
    res.status(500).json({
      error: "Module list could not be fetched.",
      details: (error as Error).message,
    });
  }
});

// 🔄 PATCH /admin/modules/:name
export const toggleModule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params;
  const { project, ...updates } = req.body;

  if (!project) {
    res.status(400).json({ error: "Project param is required." });
    return;
  }

  try {
    const updated = await ModuleSetting.findOneAndUpdate(
      { project, module: name },
      { $set: updates },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: "Module updated successfully.",
      module: updated,
    });
  } catch (err) {
    console.error("❌ toggleModule error:", err);
    res.status(500).json({
      success: false,
      message: "Module update failed.",
      error: (err as Error).message,
    });
  }
});


// 🧾 GET /admin/projects
export const getAvailableProjects = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
    const profiles = getEnvProfiles();
    res.status(200).json(profiles);
  } catch (err) {
    res.status(500).json({
      error: "Could not read environment profiles.",
      details: (err as Error).message,
    });
  }
});
