import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseCommercialRegNo(notesStr: string | null) {
  if (!notesStr) return { commercialRegNo: "", cleanNotes: "" };
  const match = notesStr.match(/\[meta:commercialRegNo=([^|\]]*)(?:\|status=([^\]]*))?\]/);
  if (match) {
    const commercialRegNo = match[1] || "";
    const cleanNotes = notesStr.replace(/\[meta:commercialRegNo=[^\]]*\]\s*/, "").trim();
    return { commercialRegNo, cleanNotes };
  }
  return { commercialRegNo: "", cleanNotes: notesStr };
}

function encodeCommercialRegNo(commercialRegNo: string | null | undefined, notesStr: string | null | undefined) {
  const regNo = (commercialRegNo || "").trim();
  const cleanNotes = (notesStr || "").replace(/\[meta:commercialRegNo=[^\]]*\]\s*/, "").trim();
  if (regNo) {
    return `[meta:commercialRegNo=${regNo}] ${cleanNotes}`.trim();
  }
  return cleanNotes;
}

export async function GET() {
  try {
    const subcontractors = await prisma.subcontractor.findMany({
      orderBy: { createdAt: "desc" },
      include: { docs: true },
    });

    const result = subcontractors.map((s) => {
      const docs = s.docs || [];
      const docsCount = docs.length;

      const totalAmount = docs.reduce((acc, d) => acc + (d.amount || 0), 0);
      const paidAmount = docs
        .filter((d) => d.status === "مدفوع")
        .reduce((acc, d) => acc + (d.amount || 0), 0);

      const { commercialRegNo, cleanNotes } = parseCommercialRegNo(s.notes);

      return {
        ...s,
        commercialRegNo,
        notes: cleanNotes,
        docsCount,
        totalAmount,
        paidAmount,
        remainingAmount: Math.max(0, totalAmount - paidAmount),
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/subcontractors:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch subcontractors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, specialty, phone, commercialRegNo, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم مقاول الباطن مطلوب" }, { status: 400 });
    }

    const encodedNotes = encodeCommercialRegNo(commercialRegNo, notes);

    const subcontractor = await prisma.subcontractor.create({
      data: {
        name,
        specialty: specialty || null,
        phone: phone || null,
        notes: encodedNotes || null,
      },
      include: { docs: true },
    });

    return NextResponse.json(
      {
        ...subcontractor,
        commercialRegNo: commercialRegNo || "",
        notes: notes || "",
        docsCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/subcontractors:", error);
    return NextResponse.json({ error: error.message || "Failed to create subcontractor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, specialty, phone, commercialRegNo, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const encodedNotes = encodeCommercialRegNo(commercialRegNo, notes);

    const subcontractor = await prisma.subcontractor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(specialty !== undefined && { specialty: specialty || null }),
        ...(phone !== undefined && { phone: phone || null }),
        notes: encodedNotes || null,
      },
      include: { docs: true },
    });

    const docs = subcontractor.docs || [];
    const totalAmount = docs.reduce((acc, d) => acc + (d.amount || 0), 0);
    const paidAmount = docs.filter((d) => d.status === "مدفوع").reduce((acc, d) => acc + (d.amount || 0), 0);

    const { commercialRegNo: parsedRegNo, cleanNotes } = parseCommercialRegNo(subcontractor.notes);

    return NextResponse.json({
      ...subcontractor,
      commercialRegNo: parsedRegNo,
      notes: cleanNotes,
      docsCount: docs.length,
      totalAmount,
      paidAmount,
      remainingAmount: Math.max(0, totalAmount - paidAmount),
    });
  } catch (error: any) {
    console.error("Error in PUT /api/subcontractors:", error);
    return NextResponse.json({ error: error.message || "Failed to update subcontractor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.subcontractor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/subcontractors:", error);
    return NextResponse.json({ error: error.message || "Failed to delete subcontractor" }, { status: 500 });
  }
}
