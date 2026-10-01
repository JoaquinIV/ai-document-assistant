import { Request, Response, NextFunction } from "express";
import { config } from "@/config";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  const message = err instanceof Error ? err.message : "Unexpected error.";
  const status = 500;

  res.status(status).json({
    error: config.env === "production" ? "Internal server error." : message,
  });
}
