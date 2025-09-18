import crypto from "crypto";
import { Request } from "express";
import { config } from "../config";

export function verifyMetaSignature(req: Request): boolean {
  const APP_SECRET = config.metaAppSecret || process.env.META_APP_SECRET || "";
  const header = req.get("X-Hub-Signature-256");
  if (!APP_SECRET || !header) return false;

  const [scheme, theirDigest] = header.split("=");
  if (scheme !== "sha256" || !theirDigest) return false;

  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!rawBody || !(rawBody instanceof Buffer)) return false;

  const ourDigest = crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(ourDigest, "utf8");
  const b = Buffer.from(theirDigest, "utf8");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
