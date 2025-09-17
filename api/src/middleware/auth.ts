// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).send("No token provided");

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).send("Invalid token format");
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    // 👇 cambiar esto:
    (req as any).user = decoded;  // en vez de req.auth
    next();
  } catch (err) {
    console.error("JWT verify failed:", err);
    return res.status(403).send("Forbidden");
  }
}
