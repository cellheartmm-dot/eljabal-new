import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObjectFromR2 } from "@/lib/r2";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Check DB for companyLogo key
    const logoSetting = await prisma.setting.findUnique({
      where: { key: "companyLogo" },
    });

    if (logoSetting && logoSetting.value) {
      const val = logoSetting.value;

      // Data URI
      if (val.startsWith("data:")) {
        const parts = val.split(",");
        const match = parts[0].match(/:(.*?);/);
        const mime = match ? match[1] : "image/jpeg";
        const buf = Buffer.from(parts[1], "base64");
        return new Response(buf, {
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      // Extract key if it's an R2 URL
      let r2Key = val;
      if (val.includes("r2.cloudflarestorage.com/")) {
        try {
          const urlObj = new URL(val);
          const pathParts = urlObj.pathname.split("/").filter(Boolean);
          if (pathParts.length > 1) {
            r2Key = pathParts.slice(1).join("/");
          }
        } catch (e) {}
      }

      const r2Data = await getObjectFromR2(r2Key);
      if (r2Data && r2Data.buffer) {
        return new Response(r2Data.buffer, {
          headers: {
            "Content-Type": r2Data.contentType || "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    // 2. Fallback to public/company-logo.jpg or local logo directory
    const publicLogoPath = path.join(process.cwd(), "public", "company-logo.jpg");
    if (fs.existsSync(publicLogoPath)) {
      const buffer = fs.readFileSync(publicLogoPath);
      return new Response(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const logoDir = path.join(process.cwd(), "logo");
    if (fs.existsSync(logoDir)) {
      const files = fs.readdirSync(logoDir);
      const logoFile = files.find((f) => /\.(png|jpe?g|svg|webp)$/i.test(f));
      if (logoFile) {
        const filePath = path.join(logoDir, logoFile);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(logoFile).toLowerCase();
        const contentType = ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";

        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    return NextResponse.json({ error: "Logo image not found" }, { status: 404 });
  } catch (error: any) {
    console.error("GET /api/settings/logo error:", error);
    return NextResponse.json({ error: error.message || "Failed to serve logo" }, { status: 500 });
  }
}
