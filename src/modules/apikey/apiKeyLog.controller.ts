import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
//import { ApiKeyLog } from "@/modules/apikey";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// GET /apikey/:keyId/logs
export const getApiKeyLogs = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyId } = req.params;

      const { Apikeylog } = await getTenantModels(req);

      const logs = await Apikeylog.find({ apiKey: keyId, tenant: req.tenant })
        .sort({ createdAt: -1 })
        .limit(100); // last 100 logs

      res.status(200).json({
        success: true,
        message: "API key logs fetched successfully.",
        data: logs,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);
