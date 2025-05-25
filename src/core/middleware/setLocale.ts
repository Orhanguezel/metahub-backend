
// middleware/setLocale.ts
/// <reference path="../../types/global.d.ts" />

import { Request, Response, NextFunction } from "express";

export const setLocale = (req: Request, _res: Response, next: NextFunction) => {
  const langHeader = req.headers["accept-language"]?.toString().toLowerCase() || "";
  req.locale =
    langHeader.startsWith("tr") ? "tr" :
    langHeader.startsWith("de") ? "de" : "en";
  next();
};

