import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supervisors = await prisma.supervisor.findMany({
      orderBy: { createdAt: "desc" },
      include: { salaries: true },
    });

    const result = supervisors.map((s) => {
      const totalPaid = s.salaries.reduce((sum, sal) => sum + (sal.amount || 0), 0);
      return {
        ...s,
        totalPaid,
        hireDate: s.hireDate ? new Date(s.hireDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/supervisors:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch supervisors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, salaryType, salary, hireDate, projectId, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم المشرف مطلوب" }, { status: 400 });
    }

    const supervisor = await prisma.supervisor.create({
      data: {
        name,
        phone: phone || null,
        salaryType: salaryType || "شهري",
        salary: parseFloat(salary) || 0,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        projectId: projectId || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: { salaries: true },
    });

    return NextResponse.json(
      {
        ...supervisor,
        totalPaid: 0,
        hireDate: new Date(supervisor.hireDate).toISOString().split("T")[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/supervisors:", error);
    return NextResponse.json({ error: error.message || "Failed to create supervisor" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, phone, salaryType, salary, hireDate, projectId, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const supervisor = await prisma.supervisor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(salaryType !== undefined && { salaryType }),
        ...(salary !== undefined && { salary: parseFloat(salary) }),
        ...(hireDate !== undefined && { hireDate: new Date(hireDate) }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: { salaries: true },
    });

    const totalPaid = supervisor.salaries.reduce((sum, sal) => sum + (sal.amount || 0), 0);
    return NextResponse.json({
      ...supervisor,
      totalPaid,
      hireDate: new Date(supervisor.hireDate).toISOString().split("T")[0],
    });
  } catch (error: any) {
    console.error("Error in PUT /api/supervisors:", error);
    return NextResponse.json({ error: error.message || "Failed to update supervisor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.supervisor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/supervisors:", error);
    return NextResponse.json({ error: error.message || "Failed to delete supervisor" }, { status: 500 });
  }
}
