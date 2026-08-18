import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get("workerId");

    const where: any = {};
    if (workerId) where.workerId = workerId;

    const dailies = await prisma.workerDaily.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        worker: { select: { id: true, name: true, dailyRate: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(dailies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.workerId) {
      return NextResponse.json({ error: "workerId is required" }, { status: 400 });
    }

    const newDaily = await prisma.workerDaily.create({
      data: {
        workerId: body.workerId,
        projectId: body.projectId || null,
        status: body.status || "حاضر",
        amount: parseFloat(body.amount) || 0,
        notes: body.notes || "",
        date: body.date ? new Date(body.date) : new Date(),
      },
    });

    return NextResponse.json(newDaily, { status: 201 });
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

    const updated = await prisma.workerDaily.update({
      where: { id: body.id },
      data: {
        projectId: body.projectId || null,
        status: body.status || "حاضر",
        amount: parseFloat(body.amount) || 0,
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

    await prisma.workerDaily.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
