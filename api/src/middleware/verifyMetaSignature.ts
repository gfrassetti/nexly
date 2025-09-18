import crypto from "crypto";
import type { RequestHandler } from "express";
import { config } from "../config";

/**
 * Valida firma de Meta (X-Hub-Signature-256: "sha256=<hex>").
 * Requiere el body crudo en (req as any).rawBody.
 */
export const verifyMetaSignature: RequestHandler = (req, res, next) => {
  const APP_SECRET = config.metaAppSecret || process.env.META_APP_SECRET || "";
  const header = req.get("X-Hub-Signature-256");

  if (!APP_SECRET || !header) return res.sendStatus(401);

  const [scheme, theirDigest] = header.split("=");
  if (scheme !== "sha256" || !theirDigest) return res.sendStatus(401);

  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!rawBody || !(rawBody instanceof Buffer)) return res.sendStatus(400);

  const ourDigest = crypto
    .createHmac("sha256", APP_SECRET)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(ourDigest, "utf8");
  const b = Buffer.from(theirDigest, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.sendStatus(401);
  }

  return next();
};
