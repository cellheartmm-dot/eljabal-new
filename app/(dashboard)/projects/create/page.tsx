"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useToast } from "@/components/ui/Toast";

const governorates = [
  "اختر المحافظة",
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الشرقية",
  "الدقهلية",
  "البحيرة",
  "القليوبية",
  "المنوفية",
  "الغربية",
  "سوهاج",
  "أسيوط",
  "المنيا",
  "قنا",
  "بني سويف",
  "كفر الشيخ",
  "أسوان",
  "دمياط",
  "الإسماعيلية",
  "الأقصر",
  "السويس",
  "بورسعيد",
  "جنوب سيناء",
  "شمال سيناء",
  "مطروح",
  "البحر الأحمر",
  "الوادي الجديد",
  "الفيوم",
];

function CreateProjectForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const [submitting, setSubmitting] = useState(false);
  const [loadingProject, setLoadingProject] = useState(isEditing);

  const [projectCode, setProjectCode] = useState("PR0001");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [governorate, setGovernorate] = useState("اختر المحافظة");
  const [status, setStatus] = useState("مخطط");
  const [address, setAddress] = useState("");
  const [value, setValue] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // New Project Files State
  const [projectFiles, setProjectFiles] = useState<FileList | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.projects || [];

        if (isEditing && editId) {
          const target = list.find((p: any) => p.id === editId);
          if (target) {
            setProjectCode(target.code || "");
            setName(target.name || "");
            setClient(target.client || "");
            setStatus(target.status || "جاري");
            setValue(String(target.value || 0));
            setStartDate(target.startDate ? new Date(target.startDate).toISOString().split("T")[0] : "");
            setEndDate(target.endDate ? new Date(target.endDate).toISOString().split("T")[0] : "");
            setNotes(target.notes || "");
          }
        } else if (data.nextCode) {
          setProjectCode(data.nextCode);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProject(false));
  }, [editId, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        id: editId || undefined,
        code: projectCode,
        name,
        client,
        governorate,
        status,
        address,
        value,
        startDate,
        endDate,
        notes,
      };

      const res = await fetch("/api/projects", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdProject = await res.json();
        const targetProjectId = editId || createdProject.id || "proj-1";

        // Upload Project Files to Cloudflare R2 if attached
        if (projectFiles && projectFiles.length > 0) {
          for (let i = 0; i < projectFiles.length; i++) {
            const fd = new FormData();
            fd.append("projectId", targetProjectId);
            fd.append("file", projectFiles[i]);
            await fetch("/api/project-files", { method: "POST", body: fd }).catch(console.error);
          }
        }

        showToast(isEditing ? "تم تحديث وتعديل بيانات المشروع بنجاح 🎉" : "تم إنشاء وإضافة المشروع ورسوماته بنجاح 🎉", "success");
        router.push("/projects");
        router.refresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || "تعذر حفظ المشروع، يرجى التحقق من البيانات والمحاولة مجدداً", "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("حدث خطأ في الشبكة أو خادم البيانات أثناء الحفظ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="empty-state" style={{ minHeight: "400px" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل بيانات المشروع للتعديل...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Row 1: Right = Project Code, Left = Project Name */}
      <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            رقم المشروع <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            required
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
            style={{ fontWeight: 800, color: "hsl(var(--gold))" }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            اسم المشروع <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="أدخل اسم المشروع"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: Client/Entity, Governorate, Status */}
      <div className="grid-3" style={{ gap: "20px", marginBottom: "20px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">العميل / الجهة</label>
          <input
            type="text"
            className="form-control"
            placeholder="اسم العميل أو الجهة المالكة"
            value={client}
            onChange={(e) => setClient(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">المحافظة</label>
          <select
            className="form-control"
            value={governorate}
            onChange={(e) => setGovernorate(e.target.value)}
          >
            {governorates.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">الحالة</label>
          <select
            className="form-control"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="مخطط">مخطط</option>
            <option value="جاري">جاري</option>
            <option value="منتهي">منتهي</option>
            <option value="متوقف">متوقف</option>
          </select>
        </div>
      </div>

      {/* Row 3: Address */}
      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label className="form-label">العنوان التفصيلي</label>
        <input
          type="text"
          className="form-control"
          placeholder="أدخل العنوان التفصيلي للموقع"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {/* Row 4: Contract Value, Start Date, Expected End Date */}
      <div className="grid-3" style={{ gap: "20px", marginBottom: "20px" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">قيمة العقد (جنيه)</label>
          <input
            type="number"
            className="form-control"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">تاريخ البدء</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">تاريخ الانتهاء المتوقع</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Row 5: Project Files Upload Field (NEW REQUIREMENT) */}
      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))", display: "flex", alignItems: "center", gap: 6 }}>
          <span>📁</span>
          <span>الملفات الخاصة بالمشروع (رفع الرسوم التنفيذية، العقود، والمستندات)</span>
        </label>
        <input
          type="file"
          multiple
          className="form-control"
          onChange={(e) => setProjectFiles(e.target.files)}
          style={{ padding: "10px" }}
        />
        <div style={{ fontSize: 11, color: "hsl(var(--text-muted))", marginTop: 4 }}>
          سيتم حفظ ورفع جميع الملفات المرفقة تلقائياً للتخزين السحابي المؤمن التابع للمشروع.
        </div>
      </div>

      {/* Row 6: Notes */}
      <div className="form-group" style={{ marginBottom: "24px" }}>
        <label className="form-label">ملاحظات</label>
        <textarea
          className="form-control"
          rows={3}
          placeholder="أية ملاحظات أو تفاصيل إضافية حول بنود ومراحل المشروع..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center" style={{ borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: "20px" }}>
        <Link href="/projects" className="btn btn-ghost">
          إلغاء
        </Link>
        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: "12px 28px", fontSize: "15px" }}>
          {submitting ? <span className="spinner" /> : isEditing ? "تحديث وتعديل البيانات" : "حفظ المشروع والتأكيد"}
        </button>
      </div>
    </form>
  );
}

export default function CreateProjectPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">🏗️ إدارة المشروع</h1>
          <p className="page-subtitle">إدخال أو تعديل تفاصيل بيانات المشروع وتفريغ الملفات ورسومات العقد</p>
        </div>
        <Link href="/projects" className="btn btn-ghost">
          ← العودة للمشاريع
        </Link>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: "28px" }}>
          <Suspense fallback={<div className="empty-state"><span className="spinner" /></div>}>
            <CreateProjectForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
