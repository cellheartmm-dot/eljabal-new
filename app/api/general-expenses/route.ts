import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function processGeneralExpenseRecord(ex: any) {
  let parsedPaymentMethod = ex.paymentMethod || "نقدي";
  let parsedNotes = ex.notes || "";

  if (ex.notes && ex.notes.includes("[meta:")) {
    try {
      const pmMatch = ex.notes.match(/\[meta:paymentMethod=([^\]]+)\]/);
      if (pmMatch) parsedPaymentMethod = pmMatch[1];

      parsedNotes = ex.notes.replace(/\[meta:[^\]]+\]/, "").trim();
    } catch (e) {
      console.error(e);
    }
  }

  return {
    ...ex,
    paymentMethod: parsedPaymentMethod,
    notes: parsedNotes,
    date: ex.date ? new Date(ex.date).toISOString().split("T")[0] : new Date(ex.createdAt).toISOString().split("T")[0],
  };
}

export async function GET() {
  try {
    const expenses = await prisma.generalExpense.findMany({
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses.map(processGeneralExpenseRecord));
  } catch (error: any) {
    console.error("Error in GET /api/general-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch general expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, type, description, amount, paymentMethod, notes } = body;

    if (!type || !amount) {
      return NextResponse.json({ error: "نوع المصروف والقيمة مطلوبة" }, { status: 400 });
    }

    const numAmount = parseFloat(amount) || 0;
    const dateVal = date || new Date().toISOString().split("T")[0];
    const pmVal = paymentMethod || "نقدي";
    const descVal = description || `مصروف ${type}`;

    const metaNotes = `[meta:paymentMethod=${pmVal}] ${notes || ""}`.trim();

    const expense = await prisma.generalExpense.create({
      data: {
        type,
        description: descVal,
        amount: numAmount,
        date: new Date(dateVal),
        notes: metaNotes,
      },
    });

    return NextResponse.json(processGeneralExpenseRecord(expense), { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/general-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to create general expense" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, date, type, description, amount, paymentMethod, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const numAmount = parseFloat(amount) || 0;
    const dateVal = date || new Date().toISOString().split("T")[0];
    const pmVal = paymentMethod || "نقدي";
    const metaNotes = `[meta:paymentMethod=${pmVal}] ${notes !== undefined ? notes : ""}`.trim();

    const expense = await prisma.generalExpense.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
        amount: numAmount,
        date: new Date(dateVal),
        notes: metaNotes,
      },
    });

    return NextResponse.json(processGeneralExpenseRecord(expense));
  } catch (error: any) {
    console.error("Error in PUT /api/general-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to update general expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.generalExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/general-expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to delete general expense" }, { status: 500 });
  }
}
