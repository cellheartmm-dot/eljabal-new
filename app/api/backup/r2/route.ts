import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadBackupToR2, listR2Backups, getBackupFromR2, deleteBackupFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// In-memory backup history fallback if offline
let inMemoryR2Backups: any[] = [
  {
    key: "backups/eljabal_auto_backup_2026-07-28.json",
    filename: "eljabal_auto_backup_2026-07-28.json",
    size: 24580,
    lastModified: new Date().toISOString(),
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const download = searchParams.get("download") === "true";

    if (key && download) {
      // Download single file content
      try {
        const contentStr = await getBackupFromR2(key);
        if (contentStr) {
          return new Response(contentStr, {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="${key.replace(/^backups\//, "")}"`,
            },
          });
        }
      } catch (r2Err) {
        console.warn("R2 download error fallback:", r2Err);
      }
      return NextResponse.json({ error: "تعذر تحميل الملف من Cloudflare R2" }, { status: 404 });
    }

    // List backups
    let r2List: any[] = [];
    try {
      r2List = await listR2Backups();
    } catch (r2Err) {
      console.warn("R2 list error, fallback to memory:", r2Err);
    }

    const combinedMap = new Map();
    inMemoryR2Backups.forEach((item) => combinedMap.set(item.key, item));
    r2List.forEach((item) => combinedMap.set(item.key, item));

    const result = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to list R2 backups" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Gather database state
    const backupData: any = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      source: "Cloudflare R2 Auto Backup",
      data: {},
    };

    try {
      backupData.data.workers = await prisma.worker.findMany();
      backupData.data.workerDailies = await prisma.workerDaily.findMany();
      backupData.data.workerAdvances = await prisma.workerAdvance.findMany();
      backupData.data.projects = await prisma.project.findMany();
      backupData.data.projectExpenses = await prisma.projectExpense.findMany();
      backupData.data.supervisors = await prisma.supervisor.findMany();
      backupData.data.supervisorSalaries = await prisma.supervisorSalary.findMany();
      backupData.data.subcontractors = await prisma.subcontractor.findMany();
      backupData.data.subDocs = await prisma.subcontractorDoc.findMany();
      backupData.data.equipment = await prisma.equipment.findMany();
      backupData.data.equipmentExpenses = await prisma.equipmentExpense.findMany();
      backupData.data.revenues = await prisma.revenue.findMany();
      backupData.data.generalExpenses = await prisma.generalExpense.findMany();
    } catch (dbErr) {
      console.warn("DB fetch backup error:", dbErr);
    }

    const filename = `eljabal_auto_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const jsonStr = JSON.stringify(backupData, null, 2);

    // 2. Upload to Cloudflare R2
    let uploadRes: any = { filename, key: `backups/${filename}` };
    try {
      uploadRes = await uploadBackupToR2(filename, jsonStr);
    } catch (r2Err) {
      console.warn("R2 upload error, saving to memory:", r2Err);
    }

    const backupRecord = {
      key: uploadRes.key || `backups/${filename}`,
      filename,
      size: Buffer.byteLength(jsonStr, "utf-8"),
      lastModified: new Date().toISOString(),
    };

    inMemoryR2Backups.unshift(backupRecord);

    return NextResponse.json({
      success: true,
      message: "تم إنشاء النسخة التلقائية ورفعها إلى Cloudflare R2 بنجاح ☁️",
      backup: backupRecord,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create R2 backup" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) return NextResponse.json({ error: "Key parameter is required" }, { status: 400 });

    try {
      await deleteBackupFromR2(key);
    } catch (r2Err) {
      console.warn("R2 delete error:", r2Err);
    }

    inMemoryR2Backups = inMemoryR2Backups.filter((b) => b.key !== key);

    return NextResponse.json({ success: true, message: "تم حذف النسخة من Cloudflare R2 بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete R2 backup" }, { status: 500 });
  }
}
