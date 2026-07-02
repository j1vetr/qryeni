import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { lookup as dnsLookup } from "dns/promises";
import { isIPv4, isIPv6 } from "net";
import sharp from "sharp";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission, getObjectAclPolicy } from "../lib/objectAcl";
import { requireAuth } from "../lib/auth";

/**
 * SSRF guard: resolve hostname and reject private/loopback/link-local addresses.
 * Throws if the URL is not a safe public HTTP(S) target.
 */
async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  const hostname = parsed.hostname;

  // Reject bare IP literals without even touching DNS
  const candidateIps = isIPv4(hostname) || isIPv6(hostname)
    ? [hostname]
    : (await dnsLookup(hostname, { all: true })).map((r) => r.address);

  for (const ip of candidateIps) {
    if (isPrivateIp(ip)) {
      throw new Error("URL resolves to a private or reserved address");
    }
  }
}

function isPrivateIp(ip: string): boolean {
  if (isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b, c] = parts;
    if (a === 127) return true;                              // loopback
    if (a === 10) return true;                               // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;       // 172.16.0.0/12
    if (a === 192 && b === 168) return true;                 // 192.168.0.0/16
    if (a === 169 && b === 254) return true;                 // link-local
    if (a === 0) return true;                                // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true;      // CGNAT 100.64.0.0/10
    if (a === 198 && b === 51 && c === 100) return true;    // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true;     // TEST-NET-3
    if (a >= 224) return true;                              // multicast + reserved
    return false;
  }
  // IPv6
  if (ip === "::1") return true;                            // loopback
  const lower = ip.toLowerCase();
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;   // ULA fc00::/7
  if (lower.startsWith("fe8") || lower.startsWith("fe9") ||
      lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local fe80::/10
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — check the embedded IPv4
    return isPrivateIp(lower.slice(7));
  }
  return false;
}

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires authentication.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * POST /storage/uploads/confirm
 *
 * After client-side upload to the presigned URL, call this endpoint to:
 * 1. Mark the object as public (visibility: "public" ACL)
 * 2. Return the serving URL for use as imageUrl in products/settings
 *
 * Requires authentication.
 */
router.post("/storage/uploads/confirm", requireAuth, async (req: Request, res: Response) => {
  const { objectPath } = req.body as { objectPath?: string };
  if (!objectPath || typeof objectPath !== "string") {
    res.status(400).json({ error: "objectPath is required" });
    return;
  }

  try {
    const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
      owner: String(req.session.userId),
      visibility: "public",
    });

    // Derive the serving URL: /api/storage/objects/{path without /objects/ prefix}
    const servingPath = normalizedPath.startsWith("/objects/")
      ? `/api/storage/objects/${normalizedPath.slice("/objects/".length)}`
      : `/api/storage/objects/${normalizedPath}`;

    res.json({ servingUrl: servingPath, objectPath: normalizedPath });
  } catch (error) {
    req.log.error({ err: error }, "Error confirming upload");
    res.status(500).json({ error: "Failed to confirm upload" });
  }
});

/**
 * POST /storage/optimize-image
 *
 * Fetch an image from a URL server-side (no CORS), resize to max 1200px wide,
 * compress as JPEG ≤200 KB using Sharp, upload to object storage, and return
 * the new serving URL.
 * Requires authentication.
 */
router.post("/storage/optimize-image", requireAuth, async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  // Fix 1: SSRF guard — validate URL scheme and resolve hostname before fetching
  try {
    await assertSafeUrl(url);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  try {
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) {
      res.status(400).json({ error: `Failed to fetch image: ${fetchRes.status}` });
      return;
    }
    const contentType = fetchRes.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "URL does not point to an image" });
      return;
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const TARGET_BYTES = 200 * 1024;

    // Guarantee ≤200KB: sweep quality [85,75,65,55,45,35,25,15,5,1] at each
    // width, then shrink width by 0.7× and repeat down to 50px.
    const QUALITIES = [85, 75, 65, 55, 45, 35, 25, 15, 5, 1];
    let maxWidth = 1200;
    let outputBuffer: Buffer = Buffer.alloc(0);
    let achieved  = false;

    outer: while (maxWidth >= 50) {
      const resized = await sharp(inputBuffer)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .toBuffer();

      for (const quality of QUALITIES) {
        outputBuffer = await sharp(resized).jpeg({ quality }).toBuffer();
        if (outputBuffer.length <= TARGET_BYTES) { achieved = true; break outer; }
      }
      maxWidth = Math.round(maxWidth * 0.7);
    }

    if (!achieved) {
      req.log.warn({ size: outputBuffer.length }, "Cannot compress image to ≤200KB");
      res.status(422).json({ error: "Image cannot be compressed to ≤200 KB even at minimum quality and size" });
      return;
    }

    // Fix 3: Verify the PUT upload actually succeeded before returning a serving URL
    const uploadURL  = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    const putResponse = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: outputBuffer,
    });
    if (!putResponse.ok) {
      req.log.error({ status: putResponse.status }, "Object upload PUT failed");
      res.status(502).json({ error: "Failed to upload optimized image to storage" });
      return;
    }

    const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
      owner: String(req.session.userId),
      visibility: "public",
    });

    const servingPath = normalizedPath.startsWith("/objects/")
      ? `/api/storage/objects/${normalizedPath.slice("/objects/".length)}`
      : `/api/storage/objects/${normalizedPath}`;

    res.json({ servingUrl: servingPath, size: outputBuffer.length });
  } catch (error) {
    req.log.error({ err: error }, "Error optimizing image");
    res.status(500).json({ error: "Failed to optimize image" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * - If ACL policy visibility is "public": serve without authentication.
 * - If ACL policy visibility is "private" or missing: require auth + ACL check.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // Check ACL — public objects are served without auth
    const aclPolicy = await getObjectAclPolicy(objectFile).catch(() => null);
    const isPublic = aclPolicy?.visibility === "public";

    if (!isPublic) {
      // Private object: require auth
      if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId: String(req.session.userId!),
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
