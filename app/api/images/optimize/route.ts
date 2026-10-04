import { NextRequest, NextResponse } from "next/server";
import {
  optimizePortfolioImageServer,
  getOptimizedStorageStats,
} from "@/lib/imageOptimizer";

export async function GET() {
  const stats = await getOptimizedStorageStats();
  return NextResponse.json({
    status: "active",
    engine: "sharp + next/image",
    ...stats,
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "No image file provided in multipart upload." },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const title = String(formData.get("title") || file.name.replace(/\.[^.]+$/, ""));
      const category = String(formData.get("category") || "portfolio");
      const preferredFormat =
        formData.get("format") === "avif" ? "avif" : "webp";
      const externalStorageEndpoint = formData.get("externalStorageEndpoint")
        ? String(formData.get("externalStorageEndpoint"))
        : undefined;

      const result = await optimizePortfolioImageServer(arrayBuffer, {
        title,
        category,
        preferredFormat,
        externalStorageEndpoint,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    const body = await request.json().catch(() => ({}));
    const imageInput = body.image || body.dataUrl || body.url;

    if (!imageInput || typeof imageInput !== "string") {
      return NextResponse.json(
        { error: "Please provide an image Data URL, base64 payload, or remote URL." },
        { status: 400 }
      );
    }

    const result = await optimizePortfolioImageServer(imageInput, {
      title: body.title,
      category: body.category,
      maxWidth: typeof body.maxWidth === "number" ? body.maxWidth : 1920,
      webpQuality: typeof body.webpQuality === "number" ? body.webpQuality : 80,
      avifQuality: typeof body.avifQuality === "number" ? body.avifQuality : 72,
      preferredFormat: body.preferredFormat === "avif" ? "avif" : "webp",
      externalStorageEndpoint: body.externalStorageEndpoint,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to optimize and convert image to AVIF/WebP.",
      },
      { status: 500 }
    );
  }
}
