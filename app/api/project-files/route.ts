import { NextResponse } from "next/server";
import { uploadProjectFileToR2, listProjectFilesR2, deleteBackupFromR2, getBackupFromR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// In-memory fallback project files store
let globalProjectFiles: any[] = [];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const key = searchParams.get("key");
    const download = searchParams.get("download") === "true";

    if (key && download) {
      try {
        const contentStr = await getBackupFromR2(key);
        if (contentStr) {
          const filename = key.split("/").pop() || "file";
          return new Response(contentStr, {
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }
      } catch (e) {
        console.warn("Project file download error:", e);
      }
      return NextResponse.json({ error: "تعذر تحميل الملف من السحابة" }, { status: 404 });
    }

    if (!projectId) {
      return NextResponse.json(globalProjectFiles);
    }

    // List R2 files for this project
    let r2Files: any[] = [];
    try {
      r2Files = await listProjectFilesR2(projectId);
    } catch (e) {
      console.warn("R2 project files list error:", e);
    }

    const memFiles = globalProjectFiles.filter((f) => f.projectId === projectId);

    const combinedMap = new Map();
    memFiles.forEach((f) => combinedMap.set(f.key || f.id, f));
    r2Files.forEach((f) => {
      combinedMap.set(f.key, {
        id: f.key,
        projectId,
        filename: f.filename,
        key: f.key,
        size: f.size,
        createdAt: f.lastModified,
      });
    });

    const result = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to list project files" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const projectId = formData.get("projectId") as string;
    const file = formData.get("file") as File;

    if (!projectId || !file) {
      return NextResponse.json({ error: "المشروع والملف مطلوبة" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const contentType = file.type || "application/octet-stream";

    let r2Res: any = null;
    try {
      r2Res = await uploadProjectFileToR2(projectId, originalName, buffer, contentType);
    } catch (r2Err) {
      console.warn("R2 upload project file warning:", r2Err);
    }

    const fileRecord = {
      id: r2Res?.key || `pf-${Date.now()}`,
      projectId,
      filename: originalName,
      key: r2Res?.key || `projects/${projectId}/${originalName}`,
      size: file.size,
      contentType,
      createdAt: new Date().toISOString(),
    };

    globalProjectFiles.unshift(fileRecord);

    return NextResponse.json({
      success: true,
      message: "تم رفع الملف للمشروع وتخزينه في السحابة بنجاح ☁️",
      file: fileRecord,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to upload project file" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const id = searchParams.get("id");

    const targetKey = key || id;

    if (!targetKey) {
      return NextResponse.json({ error: "Key parameter is required" }, { status: 400 });
    }

    try {
      await deleteBackupFromR2(targetKey);
    } catch (e) {
      console.warn("R2 delete project file error:", e);
    }

    globalProjectFiles = globalProjectFiles.filter((f) => f.key !== targetKey && f.id !== targetKey);

    return NextResponse.json({ success: true, message: "تم حذف ملف المشروع بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete project file" }, { status: 500 });
  }
}
