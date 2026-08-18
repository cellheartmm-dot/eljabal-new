import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const jobRole = searchParams.get("jobRole");
    const employmentType = searchParams.get("employmentType");
    const hasBankAuthority = searchParams.get("hasBankAuthority");
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status"); // active, inactive, all

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { nationalId: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (jobRole && jobRole !== "all") {
      where.jobRole = jobRole;
    }

    if (employmentType && employmentType !== "all") {
      where.employmentType = employmentType;
    }

    if (hasBankAuthority === "true") {
      where.hasBankAuthority = true;
    } else if (hasBankAuthority === "false") {
      where.hasBankAuthority = false;
    }

    if (projectId && projectId !== "all") {
      where.projectId = projectId;
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("GET /api/employees error:", error);
    return NextResponse.json({ error: error.message || "فشل في إحضار بيانات الموظفين" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      nationalId,
      phone,
      jobRole = "عامل",
      employmentType = "حر",
      projectId,
      hasBankAuthority = false,
      bankNotes,
      salaryType = "شهري",
      salary = 0,
      hireDate,
      photoUrl,
      idCardFrontUrl,
      idCardBackUrl,
      projectDeedUrl,
      projectDeed,
      isActive = true,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم الموظف مطلوب" }, { status: 400 });
    }

    // Safely generate unique code (EMP-0001, EMP-0002...)
    let candidateCode = body.code?.trim();
    const existingWithCode = candidateCode ? await prisma.employee.findUnique({ where: { code: candidateCode } }) : null;

    if (!candidateCode || existingWithCode) {
      const count = await prisma.employee.count();
      let tries = 1;
      let checkCode = `EMP-${(count + tries).toString().padStart(4, "0")}`;
      while (await prisma.employee.findUnique({ where: { code: checkCode } })) {
        tries++;
        checkCode = `EMP-${(count + tries).toString().padStart(4, "0")}`;
      }
      candidateCode = checkCode;
    }

    const employee = await prisma.employee.create({
      data: {
        code: candidateCode,
        name,
        nationalId: nationalId || null,
        phone: phone || null,
        jobRole,
        employmentType,
        projectId: employmentType === "مرتبط بمشروع" && projectId ? projectId : null,
        hasBankAuthority: Boolean(hasBankAuthority),
        bankNotes: bankNotes || null,
        salaryType,
        salary: parseFloat(salary) || 0,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        photoUrl: photoUrl || null,
        idCardFrontUrl: idCardFrontUrl || null,
        idCardBackUrl: idCardBackUrl || null,
        projectDeedUrl: projectDeedUrl || null,
        projectDeed: projectDeed || null,
        isActive: Boolean(isActive),
        notes: notes || null,
      },
      include: {
        project: true,
        documents: true,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/employees error:", error);
    return NextResponse.json({ error: error.message || "فشل في حفظ الموظف" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      nationalId,
      phone,
      jobRole,
      employmentType,
      projectId,
      hasBankAuthority,
      bankNotes,
      salaryType,
      salary,
      hireDate,
      photoUrl,
      idCardFrontUrl,
      idCardBackUrl,
      projectDeedUrl,
      projectDeed,
      isActive,
      notes,
    } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "معرف واسم الموظف مطلوبة" }, { status: 400 });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        nationalId: nationalId || null,
        phone: phone || null,
        jobRole,
        employmentType,
        projectId: employmentType === "مرتبط بمشروع" && projectId ? projectId : null,
        hasBankAuthority: Boolean(hasBankAuthority),
        bankNotes: bankNotes || null,
        salaryType,
        salary: parseFloat(salary) || 0,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        idCardFrontUrl: idCardFrontUrl !== undefined ? idCardFrontUrl : undefined,
        idCardBackUrl: idCardBackUrl !== undefined ? idCardBackUrl : undefined,
        projectDeedUrl: projectDeedUrl !== undefined ? projectDeedUrl : undefined,
        projectDeed: projectDeed !== undefined ? projectDeed : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        notes: notes || null,
      },
      include: {
        project: true,
        documents: true,
      },
    });

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error("PUT /api/employees error:", error);
    return NextResponse.json({ error: error.message || "فشل في تحديث الموظف" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرف الموظف مطلوب" }, { status: 400 });
    }

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "تم حذف الموظف بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/employees error:", error);
    return NextResponse.json({ error: error.message || "فشل في حذف الموظف" }, { status: 500 });
  }
}
