import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get("workerId");

    const where: any = {};
    if (workerId) where.workerId = workerId;

    const advances = await prisma.workerAdvance.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        worker: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(advances);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.workerId || !body.amount) {
      return NextResponse.json({ error: "workerId and amount are required" }, { status: 400 });
    }

    const newAdvance = await prisma.workerAdvance.create({
      data: {
        workerId: body.workerId,
        amount: parseFloat(body.amount) || 0,
        status: body.status || "مدفوع",
        notes: body.notes || "",
        date: body.date ? new Date(body.date) : new Date(),
      },
    });

    return NextResponse.json(newAdvance, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updated = await prisma.workerAdvance.update({
      where: { id: body.id },
      data: {
        amount: parseFloat(body.amount) || 0,
        status: body.status || "مدفوع",
        notes: body.notes || "",
        date: body.date ? new Date(body.date) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.workerAdvance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
