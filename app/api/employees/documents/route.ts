import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadEmployeeDocumentToR2, deleteR2Object } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const employeeId = formData.get("employeeId") as string;
    const title = (formData.get("title") as string) || "مستند موظف";
    const docType = (formData.get("docType") as string) || "general"; // photo, id_front, id_back, deed, general
    const file = formData.get("file") as File;

    if (!employeeId || !file) {
      return NextResponse.json({ error: "معرف الموظف والملف مطلوبان" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const contentType = file.type || "application/octet-stream";

    // Upload to Cloudflare R2
    const r2Result = await uploadEmployeeDocumentToR2(employeeId, originalName, buffer, contentType);

    // Save record in Database
    const documentRecord = await prisma.employeeDocument.create({
      data: {
        employeeId,
        title,
        fileKey: r2Result.key,
        fileUrl: r2Result.url,
        fileName: originalName,
        fileSize: file.size,
        contentType,
      },
    });

    // Update shortcut URLs in Employee if relevant
    const updateData: any = {};
    if (docType === "photo") {
      updateData.photoUrl = r2Result.url;
    } else if (docType === "id_front") {
      updateData.idCardFrontUrl = r2Result.url;
    } else if (docType === "id_back") {
      updateData.idCardBackUrl = r2Result.url;
    } else if (docType === "deed") {
      updateData.projectDeedUrl = r2Result.url;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم رفع مستند الموظف إلى Cloudflare R2 بنجاح ☁️",
      document: documentRecord,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/employees/documents error:", error);
    return NextResponse.json({ error: error.message || "فشل في رفع مستند الموظف" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرف المستند مطلوب" }, { status: 400 });
    }

    const doc = await prisma.employeeDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
    }

    // Try deleting from R2
    try {
      await deleteR2Object(doc.fileKey);
    } catch (r2Err) {
      console.warn("Could not delete R2 object:", r2Err);
    }

    // Delete record from Database
    await prisma.employeeDocument.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "تم حذف مستند الموظف بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/employees/documents error:", error);
    return NextResponse.json({ error: error.message || "فشل في حذف المستند" }, { status: 500 });
  }
}
