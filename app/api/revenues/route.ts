import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function processRevenueRecord(r: any) {
  // Map DB 'source' field to UI 'type' field
  let parsedType = r.type || r.source || "مستخلص أعمال";
  let parsedPaymentMethod = r.paymentMethod || "نقدي";
  let parsedDescription = r.description || "";
  let parsedNotes = r.notes || "";

  if (r.notes && r.notes.includes("[meta:")) {
    try {
      const pmMatch = r.notes.match(/\[meta:paymentMethod=([^\|]+)\|/);
      if (pmMatch) parsedPaymentMethod = pmMatch[1];

      const descMatch = r.notes.match(/description=([^\]]+)\]/);
      if (descMatch) parsedDescription = descMatch[1];

      parsedNotes = r.notes.replace(/\[meta:[^\]]+\]/, "").trim();
    } catch (e) {
      console.error(e);
    }
  }

  return {
    ...r,
    // Expose both 'type' (UI) and 'source' (DB) for compatibility
    type: parsedType,
    source: r.source || parsedType,
    projectName: r.project ? r.project.name : r.projectName || "بدون مشروع",
    paymentMethod: parsedPaymentMethod,
    description: parsedDescription,
    notes: parsedNotes,
    date: r.date ? new Date(r.date).toISOString().split("T")[0] : new Date(r.createdAt).toISOString().split("T")[0],
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const revenues = await prisma.revenue.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { date: "desc" },
      include: { project: true },
    });

    return NextResponse.json(revenues.map(processRevenueRecord));
  } catch (error: any) {
    console.error("Error in GET /api/revenues:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch revenues" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Accept both 'type' (UI) and 'source' (DB field name)
    const { date, projectId, type, source, paymentMethod, description, amount, notes } = body;

    const sourceVal = type || source;
    if (!sourceVal || !amount) {
      return NextResponse.json({ error: "نوع الإيراد والمبلغ مطلوبة" }, { status: 400 });
    }

    const numAmount = parseFloat(amount) || 0;
    const dateVal = date || new Date().toISOString().split("T")[0];
    const pmVal = paymentMethod || "نقدي";

    const metaNotes = `[meta:paymentMethod=${pmVal}|description=${description || ""}] ${notes || ""}`.trim();

    const revenue = await prisma.revenue.create({
      data: {
        projectId: projectId || null,
        source: sourceVal,
        amount: numAmount,
        date: new Date(dateVal),
        notes: metaNotes,
      },
      include: { project: true },
    });

    return NextResponse.json(processRevenueRecord(revenue), { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/revenues:", error);
    return NextResponse.json({ error: error.message || "Failed to create revenue" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, date, projectId, type, source, paymentMethod, description, amount, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const sourceVal = type || source;
    const numAmount = parseFloat(amount) || 0;
    const dateVal = date || new Date().toISOString().split("T")[0];
    const pmVal = paymentMethod || "نقدي";
    const metaNotes = `[meta:paymentMethod=${pmVal}|description=${description || ""}] ${notes || ""}`.trim();

    const revenue = await prisma.revenue.update({
      where: { id },
      data: {
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(sourceVal !== undefined && { source: sourceVal }),
        amount: numAmount,
        date: new Date(dateVal),
        notes: metaNotes,
      },
      include: { project: true },
    });

    return NextResponse.json(processRevenueRecord(revenue));
  } catch (error: any) {
    console.error("Error in PUT /api/revenues:", error);
    return NextResponse.json({ error: error.message || "Failed to update revenue" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.revenue.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/revenues:", error);
    return NextResponse.json({ error: error.message || "Failed to delete revenue" }, { status: 500 });
  }
}
