import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLAIMS_DATASET } from "./parse-folder/claimsDataset";

export const dynamic = "force-dynamic";

function processDocRecord(d: any) {
  let parsedDocNo = d.docNo || ("SC" + (d.id ? d.id.slice(-4).toUpperCase() : "0001"));
  let parsedPeriodFrom = d.periodFrom || "";
  let parsedPeriodTo = d.periodTo || "";
  let parsedItems: any[] = Array.isArray(d.items) ? d.items : [];
  let parsedPayments: any[] = Array.isArray(d.payments) ? d.payments : [];
  let parsedNotes = d.notes || "";

  if (d.notes && d.notes.includes("[meta:")) {
    try {
      const docNoMatch = d.notes.match(/\[meta:docNo=([^\|]+)\|/);
      if (docNoMatch) parsedDocNo = docNoMatch[1];

      const pfMatch = d.notes.match(/periodFrom=([^\|]+)\|/);
      if (pfMatch) parsedPeriodFrom = pfMatch[1];

      const ptMatch = d.notes.match(/periodTo=([^\|]+)\|/);
      if (ptMatch) parsedPeriodTo = ptMatch[1];

      const itemsMatch = d.notes.match(/items=(\[.*?\])\|/);
      if (itemsMatch) parsedItems = JSON.parse(itemsMatch[1]);

      const paysMatch = d.notes.match(/payments=(\[.*?\])\]/);
      if (paysMatch) parsedPayments = JSON.parse(paysMatch[1]);

      parsedNotes = d.notes.replace(/\[meta:[^\]]+\]/, "").trim();
    } catch (e) {
      console.error(e);
    }
  }

  const totalAmount = d.amount || 0;
  const paidAmount = parsedPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  let statusVal = d.status || "معلق";
  if (parsedPayments.length > 0) {
    if (paidAmount >= totalAmount && totalAmount > 0) {
      statusVal = "مدفوع";
    } else if (paidAmount > 0) {
      statusVal = "جزئي";
    }
  }

  return {
    ...d,
    docNo: parsedDocNo,
    subcontractorName: d.subcontractor ? d.subcontractor.name : d.subcontractorName || "مقاول باطن",
    projectName: d.project ? d.project.name : d.projectName || "المشروع الرئيسي",
    periodFrom: parsedPeriodFrom,
    periodTo: parsedPeriodTo,
    items: parsedItems,
    payments: parsedPayments,
    totalAmount,
    paidAmount,
    remainingAmount,
    status: statusVal,
    notes: parsedNotes,
    date: d.date ? new Date(d.date).toISOString().split("T")[0] : new Date(d.createdAt).toISOString().split("T")[0],
  };
}

async function autoSeedClaimsIfEmpty() {
  try {
    const count = await prisma.subcontractorDoc.count();
    if (count > 0) return;

    console.log("Auto-seeding verified PDF claims into database...");

    for (let item of CLAIMS_DATASET) {
      const subName = item.subcontractorName;
      const specialty = item.specialty;
      const projName = item.projectName;
      const projCode = item.projectCode;

      // Subcontractor
      let sub = await prisma.subcontractor.findFirst({
        where: { name: { contains: subName.trim() } }
      });
      if (!sub) {
        sub = await prisma.subcontractor.create({
          data: { name: subName.trim(), specialty, notes: "مستورد تلقائياً من مجلد pdf_claims" }
        });
      }

      // Project
      let proj = await prisma.project.findFirst({
        where: { name: { contains: projName.trim() } }
      });
      if (!proj) {
        const projCount = await prisma.project.count();
        proj = await prisma.project.create({
          data: {
            code: projCode || `PR${String(projCount + 1).padStart(4, "0")}`,
            name: projName.trim(),
            client: "شركة الجبل الذهبي للمقاولات",
            status: "قيد التنفيذ"
          }
        });
      }

      const metaNotes = `[meta:docNo=${item.docNo}|periodFrom=|periodTo=|items=${JSON.stringify(item.items || [])}|payments=${JSON.stringify(item.payments || [])}] مستورد تلقائياً من مجلد pdf_claims`;

      const paidAmount = (item.payments || []).reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
      const totalAmount = item.totalAmount || 0;
      let statusVal = "معلق";
      if ((item.payments || []).length > 0) {
        statusVal = paidAmount >= totalAmount && totalAmount > 0 ? "مدفوع" : "جزئي";
      }

      await prisma.subcontractorDoc.create({
        data: {
          subcontractorId: sub.id,
          projectId: proj.id,
          type: "مستخلص",
          description: item.items && item.items.length > 0 ? item.items.map((i: any) => i.itemDesc).filter(Boolean).join(" - ") : `مستخلص رقم ${item.docNo}`,
          amount: totalAmount,
          status: statusVal,
          date: new Date(item.date || "2026-07-15"),
          notes: metaNotes
        }
      });
    }
  } catch (e) {
    console.error("Auto-seeding claims error:", e);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subId = searchParams.get("subcontractorId");
    const projectId = searchParams.get("projectId");
    const docId = searchParams.get("id");

    let docs = await prisma.subcontractorDoc.findMany({
      where: {
        ...(docId ? { id: docId } : {}),
        ...(subId ? { subcontractorId: subId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { date: "desc" },
      include: { subcontractor: true, project: true },
    });

    const result = docs.map(processDocRecord);

    if (docId && result.length > 0) {
      return NextResponse.json(result[0]);
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/subcontractor-docs:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch subcontractor docs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docNo, subcontractorId, projectId, type, description, amount, status, date, periodFrom, periodTo, items, payments, notes } = body;

    if (!subcontractorId) {
      return NextResponse.json({ error: "المقاول مطلوب" }, { status: 400 });
    }

    const targetSub = await prisma.subcontractor.findUnique({ where: { id: subcontractorId } });
    const targetProj = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;

    const metaNotes = `[meta:docNo=${docNo || "SC0001"}|periodFrom=${periodFrom || ""}|periodTo=${periodTo || ""}|items=${JSON.stringify(items || [])}|payments=${JSON.stringify(payments || [])}] ${notes || ""}`;

    const newDoc = await prisma.subcontractorDoc.create({
      data: {
        subcontractorId,
        projectId: projectId || null,
        type: type || "مستخلص",
        description: description || `مستخلص رقم ${docNo || ""}`,
        amount: parseFloat(amount) || 0,
        status: status || "معلق",
        date: date ? new Date(date) : new Date(),
        notes: metaNotes,
      },
      include: {
        subcontractor: true,
        project: true,
      },
    });

    return NextResponse.json(processDocRecord(newDoc));
  } catch (error: any) {
    console.error("Error in POST /api/subcontractor-docs:", error);
    return NextResponse.json({ error: error.message || "Failed to create subcontractor doc" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, docNo, subcontractorId, projectId, type, description, amount, status, date, periodFrom, periodTo, items, payments, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "معرف المستخلص مطلوب للتعديل" }, { status: 400 });
    }

    const existingDoc = await prisma.subcontractorDoc.findUnique({ where: { id } });
    if (!existingDoc) {
      return NextResponse.json({ error: "المستخلص غير موجود" }, { status: 404 });
    }

    let existingMetaDocNo = "SC0001";
    let existingPf = "";
    let existingPt = "";
    let existingItems: any[] = [];
    let existingPayments: any[] = [];

    if (existingDoc.notes && existingDoc.notes.includes("[meta:")) {
      const matchNo = existingDoc.notes.match(/\[meta:docNo=([^\|]+)\|/);
      if (matchNo) existingMetaDocNo = matchNo[1];

      const matchPf = existingDoc.notes.match(/periodFrom=([^\|]+)\|/);
      if (matchPf) existingPf = matchPf[1];

      const matchPt = existingDoc.notes.match(/periodTo=([^\|]+)\|/);
      if (matchPt) existingPt = matchPt[1];

      const matchItems = existingDoc.notes.match(/items=(\[.*?\])\|/);
      if (matchItems) existingItems = JSON.parse(matchItems[1]);

      const matchPays = existingDoc.notes.match(/payments=(\[.*?\])\]/);
      if (matchPays) existingPayments = JSON.parse(matchPays[1]);
    }

    const finalDocNo = docNo !== undefined ? docNo : existingMetaDocNo;
    const finalPf = periodFrom !== undefined ? periodFrom : existingPf;
    const finalPt = periodTo !== undefined ? periodTo : existingPt;
    const finalItems = items !== undefined ? items : existingItems;
    const finalPayments = payments !== undefined ? payments : existingPayments;
    const cleanNotes = notes !== undefined ? notes : existingDoc.notes?.replace(/\[meta:[^\]]+\]/, "").trim() || "";

    const metaNotes = `[meta:docNo=${finalDocNo}|periodFrom=${finalPf}|periodTo=${finalPt}|items=${JSON.stringify(finalItems)}|payments=${JSON.stringify(finalPayments)}] ${cleanNotes}`;

    const updatedDoc = await prisma.subcontractorDoc.update({
      where: { id },
      data: {
        ...(subcontractorId ? { subcontractorId } : {}),
        ...(projectId !== undefined ? { projectId: projectId || null } : {}),
        ...(type ? { type } : {}),
        ...(description ? { description } : {}),
        ...(amount !== undefined ? { amount: parseFloat(amount) } : {}),
        ...(status ? { status } : {}),
        ...(date ? { date: new Date(date) } : {}),
        notes: metaNotes,
      },
      include: {
        subcontractor: true,
        project: true,
      },
    });

    return NextResponse.json(processDocRecord(updatedDoc));
  } catch (error: any) {
    console.error("Error in PUT /api/subcontractor-docs:", error);
    return NextResponse.json({ error: error.message || "Failed to update subcontractor doc" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرف المستخلص مطلوب للحذف" }, { status: 400 });
    }

    await prisma.subcontractorDoc.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "تم حذف المستخلص بنجاح" });
  } catch (error: any) {
    console.error("Error in DELETE /api/subcontractor-docs:", error);
    return NextResponse.json({ error: error.message || "Failed to delete subcontractor doc" }, { status: 500 });
  }
}
