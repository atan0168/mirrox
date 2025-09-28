// backend/src/middleware/uiLang.ts
import { Request, Response, NextFunction } from 'express';

export function detectUiLang(req: Request, _res: Response, next: NextFunction) {
  const q = req.query.ui_lang;
  (req as any).uiLang = (q === 'en' || q === 'zh' || q === 'ms') ? q : 'en';
  next();
}
