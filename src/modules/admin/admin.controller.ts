// src/modules/admin/admin.controller.ts
import fs from "fs/promises";
import path from "path";
import { Request, Response } from "express";
import { ModuleMeta } from "./admin.models";

const modulesDir = path.join(__dirname, "..");

export const getAllModules = async (_req: Request, res: Response) => {
  const dirs = await fs.readdir(modulesDir);
  const result: { name: string; label: string; enabled: boolean }[] = [];

  for (const dir of dirs) {
    const metaPath = path.join(modulesDir, dir, "meta.json");
    try {
      const metaRaw = await fs.readFile(metaPath, "utf-8");
      const meta: ModuleMeta = JSON.parse(metaRaw);
      result.push({
        name: meta.name,
        label: meta.label?.en ?? meta.name,
        enabled: meta.enabled ?? false,
      });
    } catch {
      continue;
    }
  }

  res.json(result);
};

export const toggleModule = async (req: Request, res: Response) => {
  const { name } = req.params;
  const { enabled } = req.body;

  const metaPath = path.join(modulesDir, name, "meta.json");
  try {
    const metaRaw = await fs.readFile(metaPath, "utf-8");
    const meta: ModuleMeta = JSON.parse(metaRaw);
    meta.enabled = Boolean(enabled);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    res.json({ success: true, message: "Updated", module: name });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed", error: err });
  }
};
