import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Persistent store for supervisor daily attendance
let globalSupervisorDailies: any[] = [
  {
    id: "sup-d-1",
    supervisorId: "sup-1",
    supervisorName: "م. أحمد محمود",
    projectId: "proj-1",
    projectName: "مشروع الجبل الذهبي الرئيسي",
    date: new Date().toISOString().split("T")[0],
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    status: "حاضر",
    daysCount: 1,
    notes: "إشراف على أعمال الصب والحدادة",
    createdAt: new Date().toISOString(),
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supervisorId = searchParams.get("supervisorId");
    const projectId = searchParams.get("projectId");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    let filtered = [...globalSupervisorDailies];

    if (supervisorId) {
      filtered = filtered.filter((d) => d.supervisorId === supervisorId);
    }
    if (projectId) {
      filtered = filtered.filter((d) => d.projectId === projectId);
    }
    if (month) {
      filtered = filtered.filter((d) => String(d.month) === String(month));
    }
    if (year) {
      filtered = filtered.filter((d) => String(d.year) === String(year));
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supervisorId, supervisorName, projectId, projectName, date, status, notes } = body;

    if (!supervisorId) {
      return NextResponse.json({ error: "اسم أو رقم المشرف مطلوب" }, { status: 400 });
    }

    const dDate = date ? new Date(date) : new Date();
    const monthVal = String(dDate.getMonth() + 1);
    const yearVal = String(dDate.getFullYear());

    let daysCount = 1;
    if (status === "نصف يوم") daysCount = 0.5;
    else if (status === "غائب" || status === "إجازة") daysCount = 0;

    const newDaily = {
      id: "sup-d-" + Date.now() + Math.random().toString(36).substring(2, 5),
      supervisorId,
      supervisorName: supervisorName || "مشرف",
      projectId: projectId || null,
      projectName: projectName || "بدون مشروع / إشراف عام",
      date: dDate.toISOString().split("T")[0],
      month: monthVal,
      year: yearVal,
      status: status || "حاضر",
      daysCount,
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };

    // Remove existing record for same supervisor and date if present
    globalSupervisorDailies = globalSupervisorDailies.filter(
      (d) => !(d.supervisorId === supervisorId && d.date === newDaily.date)
    );

    globalSupervisorDailies.unshift(newDaily);

    return NextResponse.json(newDaily, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      globalSupervisorDailies = globalSupervisorDailies.filter((d) => d.id !== id);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
