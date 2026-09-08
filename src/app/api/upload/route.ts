import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  const auth = await requireApiAuth(["ADMIN", "TRAINER"]);
  if ("unauthorized" in auth) return auth.unauthorized;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 30MB size limit. Please upload a smaller file or link externally." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalExt = path.extname(file.name).toLowerCase() || "";
    const allowedExts = [
      ".pdf",
      ".mp4",
      ".webm",
      ".ogg",
      ".mov",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp",
      ".svg",
    ];

    if (!allowedExts.includes(originalExt)) {
      return NextResponse.json(
        {
          error: `Unsupported file extension (${originalExt}). Allowed: PDF, MP4/WebM/MOV, PNG/JPG/WEBP/GIF/SVG.`,
        },
        { status: 400 }
      );
    }

    const randomHash = crypto.randomBytes(8).toString("hex");
    const sanitizedBase = file.name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const fileName = `${Date.now()}_${randomHash}_${sanitizedBase}${originalExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process file upload." },
      { status: 500 }
    );
  }
}
