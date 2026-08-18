import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLAIMS_DATASET } from "./claimsDataset";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const claims: any[] = [];

    for (let item of CLAIMS_DATASET) {
      const subcontractorName = item.subcontractorName;
      const specialty = item.specialty;
      const projectName = item.projectName;
      const projectCode = item.projectCode;

      // Match or Create Subcontractor in DB
      let matchedSub = await prisma.subcontractor.findFirst({
        where: { name: { contains: subcontractorName.trim() } },
      });
      if (!matchedSub) {
        matchedSub = await prisma.subcontractor.create({
          data: { name: subcontractorName.trim(), specialty, notes: "مستورد من مجلد pdf_claims" },
        });
      }

      // Match or Create Project in DB
      let matchedProj = await prisma.project.findFirst({
        where: { name: { contains: projectName.trim() } },
      });
      if (!matchedProj) {
        const count = await prisma.project.count();
        matchedProj = await prisma.project.create({
          data: {
            code: projectCode || `PR${String(count + 1).padStart(4, "0")}`,
            name: projectName.trim(),
            client: "شركة الجبل",
            status: "قيد التنفيذ",
            notes: "مستورد من مجلد pdf_claims",
          },
        });
      }

      claims.push({
        file: item.file,
        docNo: item.docNo,
        date: item.date,
        subcontractorId: matchedSub.id,
        subcontractorName: matchedSub.name,
        projectId: matchedProj.id,
        projectName: matchedProj.name,
        specialty: item.specialty,
        items: item.items,
        payments: item.payments,
        totalAmount: item.totalAmount,
      });
    }

    return NextResponse.json({
      success: true,
      totalFiles: claims.length,
      claims,
    });
  } catch (error: any) {
    console.error("Error serving pdf_claims folder dataset:", error);
    return NextResponse.json({ error: error.message || "فشل في قراءة بيانات المجلد" }, { status: 500 });
  }
}
