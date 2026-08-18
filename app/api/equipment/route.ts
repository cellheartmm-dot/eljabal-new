import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function processEquipmentRecord(eq: any) {
  let parsedCode = eq.code || "";
  let parsedPurchaseDate = eq.purchaseDate || (eq.createdAt ? new Date(eq.createdAt).toISOString().split("T")[0] : "");
  let parsedNotes = eq.notes || "";

  if (eq.notes && eq.notes.includes("[meta:")) {
    try {
      const codeMatch = eq.notes.match(/\[meta:code=([^\|]+)\|/);
      if (codeMatch) parsedCode = codeMatch[1];

      const pdMatch = eq.notes.match(/purchaseDate=([^\]]+)\]/);
      if (pdMatch) parsedPurchaseDate = pdMatch[1];

      parsedNotes = eq.notes.replace(/\[meta:[^\]]+\]/, "").trim();
    } catch (e) {
      console.error(e);
    }
  }

  const totalExpenses = Array.isArray(eq.expenses)
    ? eq.expenses.reduce((sum: number, ex: any) => sum + (ex.amount || 0), 0)
    : 0;

  return {
    ...eq,
    code: parsedCode,
    status: eq.status || "يعمل",
    purchaseDate: parsedPurchaseDate,
    notes: parsedNotes,
    totalExpenses,
  };
}

export async function GET() {
  try {
    const equipment = await prisma.equipment.findMany({
      orderBy: { createdAt: "desc" },
      include: { expenses: true },
    });

    const result = equipment.map(processEquipmentRecord);
    const nextCode = `EQ-${String(result.length + 1).padStart(3, "0")}`;

    return NextResponse.json({ equipment: result, nextCode });
  } catch (error: any) {
    console.error("Error in GET /api/equipment:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, code, type, plateNumber, status, purchaseDate, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم المعدة مطلوب" }, { status: 400 });
    }

    const count = await prisma.equipment.count();
    const generatedCode = code || `EQ-${String(count + 1).padStart(3, "0")}`;
    const statusVal = status || "يعمل";
    const pDateVal = purchaseDate || new Date().toISOString().split("T")[0];
    const typeVal = type || (name.includes("حفار") ? "حفار" : name.includes("رافعة") ? "رافعة" : name.includes("خلاط") ? "خلاطة" : "معدة عامة");

    const metaNotes = `[meta:code=${generatedCode}|purchaseDate=${pDateVal}] ${notes || ""}`.trim();

    const eq = await prisma.equipment.create({
      data: {
        name,
        type: typeVal,
        plateNumber: plateNumber || null,
        status: statusVal,
        notes: metaNotes,
      },
      include: { expenses: true },
    });

    return NextResponse.json(processEquipmentRecord(eq), { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/equipment:", error);
    return NextResponse.json({ error: error.message || "Failed to create equipment" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, code, type, plateNumber, status, purchaseDate, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "معرف المعدة مطلوب للتعديل" }, { status: 400 });
    }

    const existing = await prisma.equipment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "المعدة غير موجودة" }, { status: 404 });
    }

    const codeVal = code || "EQ-001";
    const pDateVal = purchaseDate || new Date().toISOString().split("T")[0];
    const metaNotes = `[meta:code=${codeVal}|purchaseDate=${pDateVal}] ${notes !== undefined ? notes : ""}`.trim();

    const eq = await prisma.equipment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(plateNumber !== undefined && { plateNumber: plateNumber || null }),
        ...(status !== undefined && { status }),
        notes: metaNotes,
      },
      include: { expenses: true },
    });

    return NextResponse.json(processEquipmentRecord(eq));
  } catch (error: any) {
    console.error("Error in PUT /api/equipment:", error);
    return NextResponse.json({ error: error.message || "Failed to update equipment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.equipment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/equipment:", error);
    return NextResponse.json({ error: error.message || "Failed to delete equipment" }, { status: 500 });
  }
}
