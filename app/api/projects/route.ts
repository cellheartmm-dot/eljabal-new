import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        expenses: { select: { amount: true } },
        revenues: { select: { amount: true } },
        workerDailies: { select: { amount: true } },
        _count: {
          select: { expenses: true, revenues: true, workerDailies: true, supervisors: true, subDocs: true },
        },
      },
    });

    const nextCode = `PR${String(projects.length + 1).padStart(4, "0")}`;
    return NextResponse.json({ projects, nextCode });
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "تعذر تحميل المشاريع من قاعدة البيانات. تأكد من ضبط DATABASE_URL في Vercel.", projects: [], nextCode: "PR0001" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: "اسم المشروع مطلوب" }, { status: 400 });
    }

    // Ensure unique code
    let code = body.code?.trim();
    const existingWithCode = code ? await prisma.project.findUnique({ where: { code } }) : null;

    if (!code || existingWithCode) {
      const count = await prisma.project.count();
      let candidate = `PR${String(count + 1).padStart(4, "0")}`;
      let tries = 1;
      while (await prisma.project.findUnique({ where: { code: candidate } })) {
        tries++;
        candidate = `PR${String(count + tries).padStart(4, "0")}`;
      }
      code = candidate;
    }

    const valNum = parseFloat(body.value);

    const project = await prisma.project.create({
      data: {
        code,
        name: body.name.trim(),
        client: body.client?.trim() || "",
        value: isNaN(valNum) ? 0 : valNum,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status || "مخطط",
        notes: body.notes?.trim() || "",
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: error.message || "فشل في حفظ المشروع في قاعدة البيانات" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "معرف المشروع مطلوب للتعديل" }, { status: 400 });
    }

    const valNum = parseFloat(body.value);

    const updated = await prisma.project.update({
      where: { id: body.id },
      data: {
        code: body.code?.trim(),
        name: body.name?.trim(),
        client: body.client?.trim() || "",
        value: isNaN(valNum) ? 0 : valNum,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status || "جاري",
        notes: body.notes?.trim() || "",
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/projects error:", error);
    return NextResponse.json({ error: error.message || "فشل في تحديث بيانات المشروع" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "تم حذف المشروع نهائياً من قاعدة البيانات" });
  } catch (error: any) {
    console.error("DELETE /api/projects error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete project" }, { status: 500 });
  }
}
