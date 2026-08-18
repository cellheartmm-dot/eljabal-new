import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        dailyRecords: { select: { amount: true } },
        advances: { select: { amount: true } },
        _count: { select: { dailyRecords: true, advances: true } },
      },
    });

    const result = workers.map((w) => {
      const totalDailyAmount = w.dailyRecords.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalAdvanceAmount = w.advances.reduce((sum, a) => sum + (a.amount || 0), 0);
      const totalPaid = totalDailyAmount + totalAdvanceAmount;
      return {
        ...w,
        totalDailyAmount,
        totalAdvanceAmount,
        totalPaid,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const worker = await prisma.worker.create({
      data: {
        name: body.name,
        nationalId: body.nationalId || null,
        specialty: body.specialty || "عامل",
        dailyRate: parseFloat(body.dailyRate) || 0,
        phone: body.phone || null,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(worker, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const updated = await prisma.worker.update({
      where: { id: body.id },
      data: {
        name: body.name,
        nationalId: body.nationalId || null,
        specialty: body.specialty || "عامل",
        dailyRate: parseFloat(body.dailyRate) || 0,
        phone: body.phone || null,
        isActive: body.isActive ?? true,
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

    await prisma.worker.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
