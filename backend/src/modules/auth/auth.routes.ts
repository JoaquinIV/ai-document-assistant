import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "@/db/pool";
import { config } from "@/config";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/register", async (req: Request, res: Response) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password (min 8 chars)." });
  }
  const { email, password } = parsed.data;

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: "Email already registered." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`,
    [email, passwordHash]
  );
  const user = result.rows[0];

  const token = signToken(user.id);
  return res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password." });
  }
  const { email, password } = parsed.data;

  const result = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user) {
    // Same message as a bad password, to avoid leaking which emails exist.
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = signToken(user.id);
  return res.json({ token, user: { id: user.id, email: user.email } });
});

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export const authRouter = router;
