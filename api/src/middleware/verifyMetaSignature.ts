// src/middleware/verifyMetaSignature.ts
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

/**
 * Middleware que valida la firma enviada por Meta en el header:
 *   X-Hub-Signature-256: sha256=<hex>
 *
 * Requiere que el body crudo esté disponible en req.rawBody.
 * (ver cómo adjuntarlo en el JSON parser más abajo)
 */
export default function verifyMetaSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const APP_SECRET = config.metaAppSecret; // debe existir en .env -> META_APP_SECRET
  const header = req.get("X-Hub-Signature-256");

  // Secret o header faltante
  if (!APP_SECRET || !header) {
    return res.sendStatus(401);
  }

  // Formato esperado: "sha256=<digestHex>"
  const [scheme, theirDigest] = header.split("=");
  if (scheme !== "sha256" || !theirDigest) {
    return res.sendStatus(401);
  }

  // Necesitamos el cuerpo crudo exactamente como lo recibió Express
  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!rawBody || !(rawBody instanceof Buffer)) {
    // 400 porque es un problema de parsing/servidor, no de autenticación
    return res.sendStatus(400);
  }

  // Firmamos el body con nuestro APP_SECRET
  const ourDigest = crypto
    .createHmac("sha256", APP_SECRET)
    .update(rawBody)
    .digest("hex");

  // timingSafeEqual requiere buffers del mismo largo
  const a = Buffer.from(ourDigest, "utf8");
  const b = Buffer.from(theirDigest, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.sendStatus(401);
  }

  // Firma válida
  next();
}
