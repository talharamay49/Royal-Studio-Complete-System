import sharp from "sharp";
import path from "path";
import { mkdir, writeFile, readdir, stat } from "fs/promises";
import crypto from "crypto";

export interface ImageOptimizationOptions {
  title?: string;
  category?: string;
  maxWidth?: number;
  maxHeight?: number;
  webpQuality?: number;
  avifQuality?: number;
  preferredFormat?: "avif" | "webp";
  externalStorageEndpoint?: string;
}

export interface OptimizedImageResult {
  url: string;
  avifUrl: string;
  webpUrl: string;
  blurDataURL: string;
  width: number;
  height: number;
  aspect: "tall" | "wide" | "square";
  format: "avif" | "webp";
  originalBytes: number;
  optimizedBytes: number;
  avifBytes: number;
  webpBytes: number;
  savingsPercent: number;
  storageProvider: "local-next-image" | "external-storage-endpoint";
  externalUrl?: string;
}

const OPTIMIZED_PUBLIC_SUBDIR = "/portfolio/optimized";

function sanitizeSlug(input: string): string {
  const cleaned = String(input || "portfolio")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return cleaned || "portfolio";
}

function computeAspectCategory(width: number, height: number): "tall" | "wide" | "square" {
  if (!width || !height) return "tall";
  const ratio = width / height;
  if (ratio < 0.88) return "tall";
  if (ratio > 1.18) return "wide";
  return "square";
}

/**
 * Extracts a raw Buffer from a base64 Data URL, raw base64 string, ArrayBuffer, or remote HTTP URL.
 */
export async function resolveImageInputToBuffer(
  input: string | Buffer | ArrayBuffer
): Promise<Buffer> {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  const str = String(input || "").trim();
  if (str.startsWith("data:image/")) {
    const commaIdx = str.indexOf(",");
    if (commaIdx === -1) {
      throw new Error("Malformed data:image URL.");
    }
    return Buffer.from(str.slice(commaIdx + 1), "base64");
  }
  if (str.startsWith("http://") || str.startsWith("https://")) {
    const response = await fetch(str);
    if (!response.ok) {
      throw new Error(`Failed to fetch remote image (${response.status})`);
    }
    const arr = await response.arrayBuffer();
    return Buffer.from(arr);
  }
  return Buffer.from(str, "base64");
}

/**
 * Generates a lightweight SVG/WebP shimmer blurDataURL for next/image placeholder="blur"
 */
export function getDefaultBlurDataURL(width = 16, height = 20): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#171512"/>
        <stop offset="50%" stop-color="#2a241c"/>
        <stop offset="100%" stop-color="#121110"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Server-side image optimization utility that automatically compresses and converts
 * portfolio uploads to AVIF and WebP formats, generates a tiny blurDataURL placeholder
 * for next/image, saves to /public/portfolio/optimized, and forwards to an external
 * storage endpoint when configured.
 */
export async function optimizePortfolioImageServer(
  input: string | Buffer | ArrayBuffer,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const inputBuffer = await resolveImageInputToBuffer(input);
  const originalBytes = inputBuffer.byteLength;

  const maxWidth = options.maxWidth || 1920;
  const maxHeight = options.maxHeight || 2400;
  const webpQuality = options.webpQuality || 80;
  const avifQuality = options.avifQuality || 72;
  const preferredFormat = options.preferredFormat || "webp";

  const basePipeline = sharp(inputBuffer, { failOn: "none" })
    .rotate() // Auto-orient based on EXIF
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });

  const [webpResult, avifResult, lqipBuffer] = await Promise.all([
    basePipeline
      .clone()
      .webp({ quality: webpQuality, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
    basePipeline
      .clone()
      .avif({ quality: avifQuality, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
    basePipeline
      .clone()
      .resize(16, 16, { fit: "inside" })
      .webp({ quality: 45 })
      .toBuffer(),
  ]);

  const width = webpResult.info.width || 1200;
  const height = webpResult.info.height || 1600;
  const aspect = computeAspectCategory(width, height);
  const blurDataURL = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;

  const hash = crypto
    .createHash("sha1")
    .update(inputBuffer)
    .digest("hex")
    .slice(0, 10);
  const slugBase = sanitizeSlug(
    `${options.category || "portfolio"}-${options.title || "upload"}`
  );
  const fileStem = `${slugBase}-${hash}`;

  const outputDir = path.join(process.cwd(), "public", "portfolio", "optimized");
  await mkdir(outputDir, { recursive: true });

  const webpFilename = `${fileStem}.webp`;
  const avifFilename = `${fileStem}.avif`;

  await Promise.all([
    writeFile(path.join(outputDir, webpFilename), webpResult.data),
    writeFile(path.join(outputDir, avifFilename), avifResult.data),
  ]);

  const webpUrl = `${OPTIMIZED_PUBLIC_SUBDIR}/${webpFilename}`;
  const avifUrl = `${OPTIMIZED_PUBLIC_SUBDIR}/${avifFilename}`;
  let primaryUrl = preferredFormat === "avif" ? avifUrl : webpUrl;
  let storageProvider: OptimizedImageResult["storageProvider"] = "local-next-image";
  let externalUrl: string | undefined;

  // Optional External Storage / CDN Endpoint Forwarding
  const externalEndpoint =
    options.externalStorageEndpoint || process.env.IMAGE_STORAGE_ENDPOINT?.trim();

  if (externalEndpoint && externalEndpoint.startsWith("https://")) {
    try {
      const extResponse = await fetch(externalEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: preferredFormat === "avif" ? avifFilename : webpFilename,
          contentType: preferredFormat === "avif" ? "image/avif" : "image/webp",
          width,
          height,
          aspect,
          avifBase64: avifResult.data.toString("base64"),
          webpBase64: webpResult.data.toString("base64"),
          blurDataURL,
        }),
      });
      if (extResponse.ok) {
        const extData = await extResponse.json().catch(() => ({}));
        if (typeof extData.url === "string" && extData.url.startsWith("http")) {
          externalUrl = extData.url;
          primaryUrl = extData.url;
          storageProvider = "external-storage-endpoint";
        }
      }
    } catch {
      // Gracefully fall back to local next/image optimized asset path
    }
  }

  const webpBytes = webpResult.data.byteLength;
  const avifBytes = avifResult.data.byteLength;
  const optimizedBytes = preferredFormat === "avif" ? avifBytes : webpBytes;
  const savingsPercent =
    originalBytes > 0
      ? Math.max(0, Number((((originalBytes - optimizedBytes) / originalBytes) * 100).toFixed(1)))
      : 0;

  return {
    url: primaryUrl,
    avifUrl,
    webpUrl,
    blurDataURL,
    width,
    height,
    aspect,
    format: preferredFormat,
    originalBytes,
    optimizedBytes,
    avifBytes,
    webpBytes,
    savingsPercent,
    storageProvider,
    externalUrl,
  };
}

/**
 * Inspects the /public/portfolio/optimized directory and returns stats on cached AVIF/WebP files.
 */
export async function getOptimizedStorageStats() {
  const outputDir = path.join(process.cwd(), "public", "portfolio", "optimized");
  try {
    await mkdir(outputDir, { recursive: true });
    const files = await readdir(outputDir);
    let totalBytes = 0;
    let avifCount = 0;
    let webpCount = 0;

    for (const file of files) {
      if (file.endsWith(".avif")) avifCount++;
      if (file.endsWith(".webp")) webpCount++;
      const st = await stat(path.join(outputDir, file)).catch(() => null);
      if (st) totalBytes += st.size;
    }

    return {
      directory: OPTIMIZED_PUBLIC_SUBDIR,
      totalFiles: files.length,
      avifCount,
      webpCount,
      totalBytes,
      formatsEnabled: ["image/avif", "image/webp"],
      externalEndpointConfigured: Boolean(process.env.IMAGE_STORAGE_ENDPOINT?.trim()),
    };
  } catch {
    return {
      directory: OPTIMIZED_PUBLIC_SUBDIR,
      totalFiles: 0,
      avifCount: 0,
      webpCount: 0,
      totalBytes: 0,
      formatsEnabled: ["image/avif", "image/webp"],
      externalEndpointConfigured: false,
    };
  }
}
