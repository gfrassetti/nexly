// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export default function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (!authHeader) {
    console.warn(`Auth failed: No token provided from IP ${clientIP}`);
    return res.status(401).send("No token provided");
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    console.warn(`Auth failed: Invalid token format from IP ${clientIP}`);
    return res.status(401).send("Invalid token format");
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    (req as any).user = decoded;
    
    // Log successful authentication (solo en desarrollo)
    if (config.isDevelopment) {
      console.log(`Auth success: User ${decoded.id} from IP ${clientIP}`);
    }
    
    next();
  } catch (err) {
    console.warn(`Auth failed: JWT verify failed from IP ${clientIP}:`, err);
    return res.status(403).send("Forbidden");
  }
}
