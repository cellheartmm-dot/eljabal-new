import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supervisorId = searchParams.get("supervisorId");

    const salaries = await prisma.supervisorSalary.findMany({
      where: supervisorId ? { supervisorId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { supervisor: true },
    });

    const result = salaries.map((s) => {
      // Parse meta from notes if present
      let baseSalary = 0;
      let bonuses = 0;
      let deductions = 0;
      let month = s.month;
      let year = "";
      let parsedNotes = s.notes || "";

      if (s.notes && s.notes.includes("[meta:")) {
        try {
          const baseMatch = s.notes.match(/base=([\d.]+)/);
          if (baseMatch) baseSalary = parseFloat(baseMatch[1]);
          const bonusMatch = s.notes.match(/bonus=([\d.]+)/);
          if (bonusMatch) bonuses = parseFloat(bonusMatch[1]);
          const dedMatch = s.notes.match(/deduction=([\d.]+)/);
          if (dedMatch) deductions = parseFloat(dedMatch[1]);
          const yearMatch = s.notes.match(/year=(\d+)/);
          if (yearMatch) year = yearMatch[1];
          const monthMatch = s.notes.match(/month=(\d+)/);
          if (monthMatch) month = monthMatch[1];
          parsedNotes = s.notes.replace(/\[meta:[^\]]+\]/, "").trim();
        } catch (e) {
          console.error(e);
        }
      }

      return {
        ...s,
        supervisorName: s.supervisor ? s.supervisor.name : "مشرف",
        baseSalary,
        bonuses,
        deductions,
        month,
        year,
        monthKey: s.month,
        notes: parsedNotes,
        paidAt: s.paidAt
          ? new Date(s.paidAt).toISOString().split("T")[0]
          : new Date(s.createdAt).toISOString().split("T")[0],
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/supervisor-salaries:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch supervisor salaries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supervisorId, month, year, baseSalary, bonuses, deductions, amount, paidAt, status, notes } = body;

    if (!supervisorId) {
      return NextResponse.json({ error: "رقم المشرف مطلوب" }, { status: 400 });
    }

    const baseNum = parseFloat(baseSalary) || 0;
    const bonusNum = parseFloat(bonuses) || 0;
    const deductNum = parseFloat(deductions) || 0;
    const netCalculated = Math.max(0, baseNum + bonusNum - deductNum);
    const finalNet = parseFloat(amount) || netCalculated;

    const monthVal = month || String(new Date().getMonth() + 1);
    const yearVal = year || String(new Date().getFullYear());
    const formattedMonthKey = `${yearVal}-${monthVal.padStart(2, "0")}`;

    const metaNotes = `[meta:base=${baseNum}|bonus=${bonusNum}|deduction=${deductNum}|year=${yearVal}|month=${monthVal}] ${notes || ""}`.trim();

    const salary = await prisma.supervisorSalary.create({
      data: {
        supervisorId,
        month: formattedMonthKey,
        amount: finalNet,
        status: status || "مدفوع",
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        notes: metaNotes,
      },
      include: { supervisor: true },
    });

    // Auto-create ProjectExpense records for each project allocation if provided
    if (Array.isArray(body.projectAllocations)) {
      const supName = salary.supervisor ? salary.supervisor.name : "المشرف";
      for (const alloc of body.projectAllocations) {
        if (alloc.projectId && alloc.amount > 0) {
          try {
            await prisma.projectExpense.create({
              data: {
                projectId: alloc.projectId,
                type: "رواتب إدارية",
                amount: parseFloat(alloc.amount) || 0,
                description: `رواتب مشرفين - راتب المشرف ${supName} لشهر ${formattedMonthKey} (${alloc.days} يوم عمل بالوقع)`,
                notes: `[meta:paidBy=خزينة الشركة|paymentMethod=تحويل/شيك|statement=رواتب مشرفين] راتب ${supName} عن شهر ${formattedMonthKey}`,
                date: paidAt ? new Date(paidAt) : new Date(),
              },
            });
          } catch (e) {
            console.error("Error creating allocated project expense for supervisor salary:", e);
          }
        }
      }
    }

    return NextResponse.json(
      {
        ...salary,
        supervisorName: salary.supervisor ? salary.supervisor.name : "مشرف",
        baseSalary: baseNum,
        bonuses: bonusNum,
        deductions: deductNum,
        month: monthVal,
        year: yearVal,
        monthKey: formattedMonthKey,
        notes: notes || "",
        paidAt: salary.paidAt ? new Date(salary.paidAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/supervisor-salaries:", error);
    return NextResponse.json({ error: error.message || "Failed to create supervisor salary" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, month, year, baseSalary, bonuses, deductions, amount, paidAt, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const baseNum = parseFloat(baseSalary) || 0;
    const bonusNum = parseFloat(bonuses) || 0;
    const deductNum = parseFloat(deductions) || 0;
    const netCalculated = Math.max(0, baseNum + bonusNum - deductNum);
    const finalNet = parseFloat(amount) || netCalculated;

    const monthVal = month || String(new Date().getMonth() + 1);
    const yearVal = year || String(new Date().getFullYear());
    const formattedMonthKey = `${yearVal}-${monthVal.padStart(2, "0")}`;

    const metaNotes = `[meta:base=${baseNum}|bonus=${bonusNum}|deduction=${deductNum}|year=${yearVal}|month=${monthVal}] ${notes || ""}`.trim();

    const salary = await prisma.supervisorSalary.update({
      where: { id },
      data: {
        month: formattedMonthKey,
        amount: finalNet,
        ...(status !== undefined && { status }),
        ...(paidAt !== undefined && { paidAt: paidAt ? new Date(paidAt) : null }),
        notes: metaNotes,
      },
      include: { supervisor: true },
    });

    return NextResponse.json({
      ...salary,
      supervisorName: salary.supervisor ? salary.supervisor.name : "مشرف",
      baseSalary: baseNum,
      bonuses: bonusNum,
      deductions: deductNum,
      month: monthVal,
      year: yearVal,
      monthKey: formattedMonthKey,
      notes: notes || "",
      paidAt: salary.paidAt ? new Date(salary.paidAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    });
  } catch (error: any) {
    console.error("Error in PUT /api/supervisor-salaries:", error);
    return NextResponse.json({ error: error.message || "Failed to update supervisor salary" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.supervisorSalary.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/supervisor-salaries:", error);
    return NextResponse.json({ error: error.message || "Failed to delete supervisor salary" }, { status: 500 });
  }
}
