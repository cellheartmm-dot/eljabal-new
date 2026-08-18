import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadLogoToR2 } from "@/lib/r2";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

async function ensureLocalLogoUploadedToR2() {
  try {
    const logoDir = path.join(process.cwd(), "logo");
    if (!fs.existsSync(logoDir)) return null;

    const files = fs.readdirSync(logoDir);
    const logoFile = files.find((f) => /\.(png|jpe?g|svg|webp)$/i.test(f));
    if (!logoFile) return null;

    const filePath = path.join(logoDir, logoFile);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(logoFile).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";

    const r2Result = await uploadLogoToR2(logoFile, buffer, contentType);

    await prisma.setting.upsert({
      where: { key: "companyLogo" },
      update: { value: r2Result.url },
      create: { key: "companyLogo", value: r2Result.url },
    });

    return r2Result.url;
  } catch (e) {
    console.warn("Could not auto-upload local logo folder file to R2:", e);
    return null;
  }
}

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    let logoUrl = settingsMap.companyLogo || null;

    // If companyLogo is not set in DB, auto upload logo from logo/ folder to Cloudflare R2
    if (!logoUrl) {
      const autoR2Logo = await ensureLocalLogoUploadedToR2();
      if (autoR2Logo) {
        logoUrl = autoR2Logo;
      }
    }

    return NextResponse.json({
      companyName: settingsMap.companyName || "الجبل الذهبي للمقاولات",
      phone: settingsMap.phone || "01000000000",
      companyLogo: "/api/settings/logo",
      rawLogoKey: logoUrl,
      ...settingsMap,
    });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: error.message || "فشل في إحضار الإعدادات" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let companyName = "الجبل الذهبي للمقاولات";
    let phone = "01000000000";
    let logoUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      companyName = (formData.get("companyName") as string) || companyName;
      phone = (formData.get("phone") as string) || phone;
      const logoFile = formData.get("logo") as File | null;

      if (logoFile && logoFile.size > 0) {
        const buffer = Buffer.from(await logoFile.arrayBuffer());
        const r2Result = await uploadLogoToR2(logoFile.name, buffer, logoFile.type);
        logoUrl = r2Result.url;
      }
    } else {
      const body = await req.json();
      companyName = body.companyName || companyName;
      phone = body.phone || phone;
      if (body.companyLogo) {
        logoUrl = body.companyLogo;
      }
    }

    // Force upload from local logo directory if requested or if no logoUrl provided
    if (!logoUrl) {
      const autoR2Logo = await ensureLocalLogoUploadedToR2();
      if (autoR2Logo) {
        logoUrl = autoR2Logo;
      }
    }

    const updates: Promise<any>[] = [
      prisma.setting.upsert({
        where: { key: "companyName" },
        update: { value: companyName },
        create: { key: "companyName", value: companyName },
      }),
      prisma.setting.upsert({
        where: { key: "phone" },
        update: { value: phone },
        create: { key: "phone", value: phone },
      }),
    ];

    if (logoUrl) {
      updates.push(
        prisma.setting.upsert({
          where: { key: "companyLogo" },
          update: { value: logoUrl },
          create: { key: "companyLogo", value: logoUrl },
        })
      );
    }

    await Promise.all(updates);

    const allSettings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    allSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      message: "تم حفظ وتثبيت شعار الشركة في Cloudflare R2 بنجاح ☁️",
      companyName: settingsMap.companyName,
      phone: settingsMap.phone,
      companyLogo: `/api/settings/logo?t=${Date.now()}`,
    });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ error: error.message || "فشل في حفظ الإعدادات والشعار" }, { status: 500 });
  }
}
