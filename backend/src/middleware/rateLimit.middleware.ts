import { Response, NextFunction } from "express";
import { config } from "@/config";
import { AuthenticatedRequest } from "@/middleware/auth.middleware";

/**
 * In-memory sliding-window limiter, scoped per user. Good enough for this
 * assessment's single-process scope; a real multi-instance deployment would
 * back this with Redis (INCR + EXPIRE) so limits are shared across pods.
 * See README "How you'd control costs and rate limits in production".
 */
const buckets = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;

export function rateLimitByUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.userId;
  if (!userId) return next(); // auth middleware already rejects unauthenticated requests

  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStart: now });
    return next();
  }

  if (bucket.count >= config.rateLimit.maxRequestsPerMinutePerUser) {
    return res.status(429).json({
      error: "Rate limit exceeded. Please wait before sending more requests.",
    });
  }

  bucket.count += 1;
  next();
}
