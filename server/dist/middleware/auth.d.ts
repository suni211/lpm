import { Request, Response, NextFunction } from 'express';
export declare const isAuthenticated: (req: Request, res: Response, next: NextFunction) => void;
export declare const isAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map