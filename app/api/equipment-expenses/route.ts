import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function processEquipmentExpense(ex: any) {
  let projectId = "";
  let projectName = "معدة عامة / بدون مشروع";
  let cleanNotes = ex.notes || "";

  if (ex.notes && ex.notes.includes("[meta:")) {
    try {
      const pIdMatch = ex.notes.match(/projectId=([^\|\]]+)/);
      if (pIdMatch) projectId = pIdMatch[1];

      const pNameMatch = ex.notes.match(/projectName=([^\|\]]+)/);
      if (pNameMatch) projectName = pNameMatch[1];

      cleanNotes = ex.notes.replace(/\[meta:[^\]]+\]/, "").trim();
    } catch (e) {
      console.error(e);
    }
  }

  return {
    ...ex,
    projectId,
    projectName,
    equipmentName: ex.equipment ? ex.equipment.name : "معدة",
    notes: cleanNotes,
    date: ex.date ? new Date(ex.date).toISOString().split("T")[0] : new Date(ex.createdAt).toISOString().split("T")[0],
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get("equipmentId");

    const expenses = await prisma.equipmentExpense.findMany({
      where: equipmentId ? { equipmentId } : undefined,
      orderBy: { date: "desc" },
      include: { equipment: true },
    });

    return NextResponse.json(expenses.map(processEquipmentExpense));
  } catch (error: any) {
    console.error("Error in GET /api/equipment-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch equipment expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { equipmentId, projectId, projectName, type, description, amount, date, notes } = body;

    if (!equipmentId) {
      return NextResponse.json({ error: "معرف المعدة مطلوب" }, { status: 400 });
    }
    if (!amount) {
      return NextResponse.json({ error: "مبلغ المصروف مطلوب" }, { status: 400 });
    }

    const numAmount = parseFloat(amount) || 0;
    const dateVal = date || new Date().toISOString().split("T")[0];
    const metaNotes = `[meta:projectId=${projectId || ""}|projectName=${projectName || ""}] ${notes || ""}`.trim();

    const expense = await prisma.equipmentExpense.create({
      data: {
        equipmentId,
        type: type || "سولار ووقود",
        description: description || "مصروف معدة",
        amount: numAmount,
        date: new Date(dateVal),
        notes: metaNotes,
      },
      include: { equipment: true },
    });

    // Auto-create ProjectExpense if projectId is supplied so project account auto-balances!
    if (projectId && projectId.length > 5) {
      try {
        const eqName = expense.equipment ? expense.equipment.name : "معدة";
        await prisma.projectExpense.create({
          data: {
            projectId,
            type: "معدات وآليات",
            amount: numAmount,
            description: `مصروفات معدات (${eqName}) - ${type || "وقود/صيانة"}: ${description || "تكلفة تشغيل بالموقع"}`,
            notes: `[meta:paidBy=خزينة الشركة|paymentMethod=نقدي|statement=مصروف معدة بالموقع] ${notes || ""}`,
            date: new Date(dateVal),
          },
        });
      } catch (dbErr) {
        console.error("Error auto-creating ProjectExpense for equipment expense:", dbErr);
      }
    }

    return NextResponse.json(processEquipmentExpense(expense), { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/equipment-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to create equipment expense" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, projectId, projectName, type, description, amount, date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const numAmount = parseFloat(amount) || 0;
    const dateVal = date || new Date().toISOString().split("T")[0];
    const metaNotes = `[meta:projectId=${projectId || ""}|projectName=${projectName || ""}] ${notes || ""}`.trim();

    const expense = await prisma.equipmentExpense.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        amount: numAmount,
        date: new Date(dateVal),
        notes: metaNotes,
      },
      include: { equipment: true },
    });

    return NextResponse.json(processEquipmentExpense(expense));
  } catch (error: any) {
    console.error("Error in PUT /api/equipment-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to update equipment expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.equipmentExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/equipment-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to delete equipment expense" }, { status: 500 });
  }
}
