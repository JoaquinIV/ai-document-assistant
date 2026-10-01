import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "@/config";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token." });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
