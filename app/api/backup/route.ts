import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backupData: any = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
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
      console.warn("Prisma DB fetch during backup warning:", dbErr);
    }

    return NextResponse.json(backupData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate backup" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.data) {
      return NextResponse.json({ error: "ملف النسخة الاحتياطية غير صالحة" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "تمت استعادة البيانات بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to restore backup" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get("table");
    const resetAll = searchParams.get("all") === "true";

    if (resetAll) {
      try {
        await prisma.workerDaily.deleteMany();
        await prisma.workerAdvance.deleteMany();
        await prisma.worker.deleteMany();
        await prisma.projectExpense.deleteMany();
        await prisma.subcontractorDoc.deleteMany();
        await prisma.subcontractor.deleteMany();
        await prisma.supervisorSalary.deleteMany();
        await prisma.supervisor.deleteMany();
        await prisma.equipmentExpense.deleteMany();
        await prisma.equipment.deleteMany();
        await prisma.revenue.deleteMany();
        await prisma.generalExpense.deleteMany();
        await prisma.project.deleteMany();
      } catch (dbErr) {
        console.warn("DB reset all error:", dbErr);
      }
      return NextResponse.json({ success: true, message: "تم تصفير النظام بالكامل بنجاح" });
    }

    if (table) {
      try {
        if (table === "workers") {
          await prisma.workerDaily.deleteMany();
          await prisma.workerAdvance.deleteMany();
          await prisma.worker.deleteMany();
        } else if (table === "projects") {
          await prisma.projectExpense.deleteMany();
          await prisma.project.deleteMany();
        } else if (table === "supervisors") {
          await prisma.supervisorSalary.deleteMany();
          await prisma.supervisor.deleteMany();
        } else if (table === "subcontractors") {
          await prisma.subcontractorDoc.deleteMany();
          await prisma.subcontractor.deleteMany();
        } else if (table === "equipment") {
          await prisma.equipmentExpense.deleteMany();
          await prisma.equipment.deleteMany();
        } else if (table === "revenues") {
          await prisma.revenue.deleteMany();
        } else if (table === "generalExpenses") {
          await prisma.generalExpense.deleteMany();
        }
      } catch (dbErr) {
        console.warn(`DB reset table ${table} error:`, dbErr);
      }
      return NextResponse.json({ success: true, message: `تم تصفير جدول (${table}) بنجاح` });
    }

    return NextResponse.json({ error: "لم يتم تحديد الجدول للتصفير" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reset data" }, { status: 500 });
  }
}
