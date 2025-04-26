import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { z } from "zod";
import { getEnvProfiles } from "../../tools/getEnvProfiles";
import ModuleSetting from "./moduleSettings.model";
import ModuleMetaModel from "./moduleMeta.model";

// ✅ Ortak Zod şemaları
const querySchema = z.object({
  project: z.string().min(1, "Query param 'project' is required."),
  lang: z.enum(["tr", "en", "de"]).optional(),
});

// 📥 GET /admin/modules?project=xxx&lang=tr
export const getAllModules = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parseResult = querySchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { project, lang = "en" } = parseResult.data;

  const settings = await ModuleSetting.find({ project }).lean();
  const metas = await ModuleMetaModel.find().sort({ name: 1 }).lean();

  const result = metas.map((meta) => {
    const setting = settings.find((s) => s.module === meta.name);

    return {
      name: meta.name,
      label: meta.label?.[lang] || meta.label?.["en"] || meta.name,
      icon: setting?.icon || meta.icon,
      enabled: setting?.enabled ?? meta.enabled,
      visibleInSidebar: setting?.visibleInSidebar ?? meta.visibleInSidebar,
      useAnalytics: setting?.useAnalytics ?? meta.useAnalytics,
      roles: setting?.roles || meta.roles,
      version: meta.version,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      routes: meta.routes,
      history: meta.history,
    };
  });

  res.status(200).json(result);
});

// 📘 GET /admin/modules/:name?project=xxx
export const getModuleDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params;
  const parseResult = querySchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { project, lang = "en" } = parseResult.data;

  const meta = await ModuleMetaModel.findOne({ name }).lean();
  if (!meta) {
    res.status(404).json({ error: `Meta not found for module "${name}"` });
    return;
  }

  const setting = await ModuleSetting.findOne({ project, module: name }).lean();

  res.status(200).json({
    name: meta.name,
    label: meta.label?.[lang] || meta.label?.["en"] || meta.name,
    icon: setting?.icon || meta.icon,
    enabled: setting?.enabled ?? meta.enabled,
    visibleInSidebar: setting?.visibleInSidebar ?? meta.visibleInSidebar,
    useAnalytics: setting?.useAnalytics ?? meta.useAnalytics,
    roles: setting?.roles || meta.roles,
    version: meta.version,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    routes: meta.routes,
    history: meta.history,
  });
});


// 🧾 GET /admin/projects
export const getAvailableProjects = asyncHandler(async (_req: Request, res: Response) => {
  const profiles = getEnvProfiles();
  res.status(200).json(profiles);
});
