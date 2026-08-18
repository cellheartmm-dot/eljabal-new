import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory / dynamic store for project phases
let globalPhasesStore: any[] = [];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (projectId) {
      const filtered = globalPhasesStore.filter((p) => p.projectId === projectId);
      return NextResponse.json(filtered);
    }

    return NextResponse.json(globalPhasesStore);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newPhase = {
      id: body.id || Date.now().toString(),
      projectId: body.projectId,
      modelName: body.modelName || "",
      phaseName: body.phaseName,
      unit: body.unit || "م²",
      unitPrice: parseFloat(body.unitPrice) || 0,
      progressPercent: String(body.progressPercent || "0"),
      executedQty: parseFloat(body.executedQty) || 0,
      totalSurveyedQty: parseFloat(body.totalSurveyedQty) || 0,
      buildings: body.buildings || [],
      subcontractorId: body.subcontractorId || null,
      subcontractorName: body.subcontractorName || "",
      notes: body.notes || "",
      createdAt: new Date().toISOString(),
    };

    // Remove existing if duplicate ID
    globalPhasesStore = globalPhasesStore.filter((p) => p.id !== newPhase.id);
    globalPhasesStore.unshift(newPhase);

    return NextResponse.json(newPhase, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const index = globalPhasesStore.findIndex((p) => p.id === body.id);
    if (index !== -1) {
      globalPhasesStore[index] = {
        ...globalPhasesStore[index],
        modelName: body.modelName !== undefined ? body.modelName : globalPhasesStore[index].modelName,
        phaseName: body.phaseName !== undefined ? body.phaseName : globalPhasesStore[index].phaseName,
        unit: body.unit !== undefined ? body.unit : globalPhasesStore[index].unit,
        unitPrice: body.unitPrice !== undefined ? parseFloat(body.unitPrice) : globalPhasesStore[index].unitPrice,
        progressPercent: body.progressPercent !== undefined ? String(body.progressPercent) : globalPhasesStore[index].progressPercent,
        executedQty: body.executedQty !== undefined ? parseFloat(body.executedQty) : globalPhasesStore[index].executedQty,
        totalSurveyedQty: body.totalSurveyedQty !== undefined ? parseFloat(body.totalSurveyedQty) : globalPhasesStore[index].totalSurveyedQty,
        buildings: body.buildings !== undefined ? body.buildings : globalPhasesStore[index].buildings,
        subcontractorId: body.subcontractorId !== undefined ? body.subcontractorId : globalPhasesStore[index].subcontractorId,
        subcontractorName: body.subcontractorName !== undefined ? body.subcontractorName : globalPhasesStore[index].subcontractorName,
        notes: body.notes !== undefined ? body.notes : globalPhasesStore[index].notes,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json(globalPhasesStore[index]);
    }

    return NextResponse.json(body);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      globalPhasesStore = globalPhasesStore.filter((p) => p.id !== id);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
