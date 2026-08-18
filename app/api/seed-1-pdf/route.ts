import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Project
    let proj = await prisma.project.findFirst({
      where: { name: { contains: "مستقبل سكن عمارات" } }
    });

    if (!proj) {
      proj = await prisma.project.create({
        data: {
          code: "PR0004",
          name: "مستقبل سكن عمارات",
          client: "شركة الجبل الذهبي للمقاولات",
          status: "قيد التنفيذ",
          notes: "تم الإنشاء تلقائياً من ملف 1.pdf"
        }
      });
    }

    // 2. Subcontractor
    let sub = await prisma.subcontractor.findFirst({
      where: { name: { contains: "إبراهيم أبو علي" } }
    });

    if (!sub) {
      sub = await prisma.subcontractor.create({
        data: {
          name: "إبراهيم أبو علي",
          specialty: "أعمال حدادة ومسلح",
          phone: "01005167758",
          notes: "تم الإنشاء تلقائياً من ملف 1.pdf"
        }
      });
    }

    // 3. Claim Items & Payments
    const docNo = "SC0030";
    const date = "2026-07-20";
    const totalAmount = 298870;

    const items = [
      {
        id: "item-1",
        itemDesc: "سقف الدور الأرضي",
        modelName: "-",
        buildingNo: "tr31",
        floorNo: "الأرضي",
        unit: "م³",
        totalQty: 200,
        execPercent: 95,
        execQty: 190,
        unitPrice: 650,
        rowTotal: 123500
      },
      {
        id: "item-2",
        itemDesc: "سقف الدور الأرضي",
        modelName: "-",
        buildingNo: "tr32",
        floorNo: "الأرضي",
        unit: "م³",
        totalQty: 200,
        execPercent: 95,
        execQty: 190,
        unitPrice: 650,
        rowTotal: 123500
      },
      {
        id: "item-3",
        itemDesc: "عمود أول علوي",
        modelName: "-",
        buildingNo: "tr31",
        floorNo: "الأول علوي",
        unit: "م²",
        totalQty: 42,
        execPercent: 95,
        execQty: 39.9,
        unitPrice: 650,
        rowTotal: 25935
      },
      {
        id: "item-4",
        itemDesc: "عمود أول علوي",
        modelName: "-",
        buildingNo: "tr32",
        floorNo: "الأول علوي",
        unit: "م²",
        totalQty: 42,
        execPercent: 95,
        execQty: 39.9,
        unitPrice: 650,
        rowTotal: 25935
      }
    ];

    const payments = [
      {
        id: "pay-1",
        amount: 30000,
        date: "2026-06-17",
        method: "نقداً",
        paidBy: "احمد ابو زيد",
        notes: "دفعة مستخلصة"
      },
      {
        id: "pay-2",
        amount: 20000,
        date: "2026-06-18",
        method: "نقداً",
        paidBy: "احمد ابو زيد",
        notes: "دفعة مستخلصة"
      },
      {
        id: "pay-3",
        amount: 20000,
        date: "2026-06-22",
        method: "نقداً",
        paidBy: "احمد ابو زيد",
        notes: "دفعة مستخلصة"
      },
      {
        id: "pay-4",
        amount: 50000,
        date: "2026-06-25",
        method: "نقداً",
        paidBy: "احمد ابو زيد",
        notes: "دفعة مستخلصة"
      },
      {
        id: "pay-5",
        amount: 30000,
        date: "2026-07-02",
        method: "نقداً",
        paidBy: "احمد ابو زيد",
        notes: "دفعة مستخلصة"
      },
      {
        id: "pay-6",
        amount: 20000,
        date: "2026-07-07",
        method: "نقداً",
        paidBy: "احمد ابو زيد",
        notes: "دفعة مستخلصة"
      },
      {
        id: "pay-7",
        amount: 30000,
        date: "2026-07-17",
        method: "نقداً",
        paidBy: "احمد ابو زيد",
        notes: "دفعة مستخلصة"
      }
    ];

    const metaNotes = `[meta:docNo=${docNo}|periodFrom=|periodTo=|items=${JSON.stringify(items)}|payments=${JSON.stringify(payments)}] تم الاستيراد والاعتماد من ملف 1.pdf`;

    let claim = await prisma.subcontractorDoc.findFirst({
      where: {
        subcontractorId: sub.id,
        projectId: proj.id,
        amount: totalAmount
      }
    });

    if (claim) {
      claim = await prisma.subcontractorDoc.update({
        where: { id: claim.id },
        data: {
          subcontractorId: sub.id,
          projectId: proj.id,
          type: "مستخلص",
          description: "سقف الدور الارضى + عمود اول علوى (tr31, tr32)",
          amount: totalAmount,
          status: "جزئي",
          date: new Date(date),
          notes: metaNotes
        }
      });
    } else {
      claim = await prisma.subcontractorDoc.create({
        data: {
          subcontractorId: sub.id,
          projectId: proj.id,
          type: "مستخلص",
          description: "سقف الدور الارضى + عمود اول علوى (tr31, tr32)",
          amount: totalAmount,
          status: "جزئي",
          date: new Date(date),
          notes: metaNotes
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ بيانات 1.pdf بنجاح في قاعدة البيانات",
      project: proj,
      subcontractor: sub,
      claim
    });
  } catch (error: any) {
    console.error("Error seeding 1.pdf data:", error);
    return NextResponse.json({ error: error.message || "فشل في حفظ البيانات" }, { status: 500 });
  }
}
