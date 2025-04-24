// middleware/setLocale.ts
/// <reference path="../../types/global.d.ts" />

import { Request, Response, NextFunction } from "express";

export const setLocale = (req: Request, _res: Response, next: NextFunction) => {
  const lang = req.headers["accept-language"]?.toString().toLowerCase();

  req.locale =
    lang?.startsWith("tr") ? "tr" :
    lang?.startsWith("de") ? "de" :
    "en";

  next();
};
