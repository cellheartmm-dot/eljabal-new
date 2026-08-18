import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function processExpenseRecord(exp: any) {
  let paidBy = "شركة الجبل";
  let paymentMethod = "نقدي";
  let statement = "";
  let cleanNotes = exp.notes || "";

  if (exp.notes && exp.notes.includes("[meta:")) {
    try {
      const paidByMatch = exp.notes.match(/paidBy=([^\|\]]+)/);
      if (paidByMatch) paidBy = paidByMatch[1];

      const pmMatch = exp.notes.match(/paymentMethod=([^\|\]]+)/);
      if (pmMatch) paymentMethod = pmMatch[1];

      const stMatch = exp.notes.match(/statement=([^\|\]]+)/);
      if (stMatch) statement = stMatch[1];

      cleanNotes = exp.notes.replace(/\[meta:[^\]]+\]/, "").trim();
    } catch (e) {
      console.error(e);
    }
  } else if (exp.description && exp.description.includes("القائم بالصرف:")) {
    const match = exp.description.match(/القائم بالصرف:\s*([^\|]+)/);
    if (match) paidBy = match[1].trim();
  }

  return {
    ...exp,
    paidBy: exp.paidBy || paidBy,
    paymentMethod: exp.paymentMethod || paymentMethod,
    statement: exp.statement || statement || exp.description,
    notes: cleanNotes || exp.notes || "",
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const expenses = await prisma.projectExpense.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(expenses.map(processExpenseRecord));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.projectId || !body.amount) {
      return NextResponse.json({ error: "المشروع والقيمة مطلوبان" }, { status: 400 });
    }

    const paidByVal = body.paidBy || "شركة الجبل";
    const pmVal = body.paymentMethod || "نقدي";
    const stVal = body.statement || "";
    const notesVal = body.description || body.notes || "";

    const metaNotes = `[meta:paidBy=${paidByVal}|paymentMethod=${pmVal}|statement=${stVal}] ${notesVal}`.trim();
    const formattedDesc = `${stVal ? stVal + " - " : ""}${paidByVal ? "القائم بالصرف: " + paidByVal + " | " : ""}${notesVal}`;

    const expense = await prisma.projectExpense.create({
      data: {
        projectId: body.projectId,
        type: body.type || "أخرى",
        amount: parseFloat(body.amount) || 0,
        description: formattedDesc,
        notes: metaNotes,
        date: body.date ? new Date(body.date) : new Date(),
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(processExpenseRecord(expense), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "معرف المصروف مطلوب للتعديل" }, { status: 400 });
    }

    const paidByVal = body.paidBy || "شركة الجبل";
    const pmVal = body.paymentMethod || "نقدي";
    const stVal = body.statement || "";
    const notesVal = body.description || body.notes || "";

    const metaNotes = `[meta:paidBy=${paidByVal}|paymentMethod=${pmVal}|statement=${stVal}] ${notesVal}`.trim();
    const formattedDesc = `${stVal ? stVal + " - " : ""}${paidByVal ? "القائم بالصرف: " + paidByVal + " | " : ""}${notesVal}`;

    const updated = await prisma.projectExpense.update({
      where: { id: body.id },
      data: {
        projectId: body.projectId,
        type: body.type || "أخرى",
        amount: parseFloat(body.amount) || 0,
        description: formattedDesc,
        notes: metaNotes,
        date: body.date ? new Date(body.date) : undefined,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(processExpenseRecord(updated));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.projectExpense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
