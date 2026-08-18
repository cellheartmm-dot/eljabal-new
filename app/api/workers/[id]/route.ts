import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        dailyRecords: {
          orderBy: { date: "desc" },
          include: { project: { select: { id: true, name: true, code: true } } },
        },
        advances: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const totalDailyAmount = worker.dailyRecords.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalAdvanceAmount = worker.advances.reduce((sum, a) => sum + (a.amount || 0), 0);

    return NextResponse.json({
      ...worker,
      totalDailyAmount,
      totalAdvanceAmount,
      totalPaid: totalDailyAmount + totalAdvanceAmount,
      remainingBalance: totalDailyAmount - totalAdvanceAmount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
