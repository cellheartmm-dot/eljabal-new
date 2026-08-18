"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function CreateEquipmentExpensePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("سولار ووقود");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/equipment").then((res) => res.json()),
      fetch("/api/projects").then((res) => res.json()),
    ])
      .then(([eqData, projData]) => {
        const eqL = Array.isArray(eqData) ? eqData : eqData?.equipment || [];
        setEquipmentList(eqL);
        if (eqL.length > 0) {
          setEquipmentId(eqL[0].id);
          setEquipmentName(eqL[0].name);
        }

        const pL = Array.isArray(projData) ? projData : projData?.projects || [];
        setProjectsList(pL);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const targetEq = equipmentList.find((eq) => eq.id === equipmentId);
    const finalEquipName = targetEq ? targetEq.name : equipmentName || "معدة";

    const targetProj = projectsList.find((p) => p.id === projectId);
    const finalProjName = targetProj ? targetProj.name : "";

    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: equipmentId || "eq-1",
          equipmentName: finalEquipName,
          projectId: projectId || null,
          projectName: finalProjName,
          type,
          description: description || `مصروف ${type}`,
          amount,
          date,
          notes,
        }),
      });

      if (res.ok) {
        showToast("تم تسجيل مصروف المعدة وتصفية حسابه على كلفة المشروع بنجاح 🎉", "success");
        router.push("/equipment-expenses");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ تسجيل مصروف معدة وربطه بالمشروع</h1>
          <p className="page-subtitle">إدخال تكلفة وقود أو صيانة معدة وتخصيصها لكلفة المشروع لتصفية الحسابات</p>
        </div>
        <Link href="/equipment-expenses" className="btn btn-ghost">
          ← العودة لمصروفات المعدات
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Equipment Selection */}
            <div className="form-group">
              <label className="form-label">المعدة المستهدفة *</label>
              {equipmentList.length > 0 ? (
                <select
                  className="form-control"
                  required
                  value={equipmentId}
                  onChange={(e) => {
                    setEquipmentId(e.target.value);
                    const sel = equipmentList.find((eq) => eq.id === e.target.value);
                    if (sel) setEquipmentName(sel.name);
                  }}
                >
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.code || ""})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: حفار كوماتسو 200"
                  required
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                />
              )}
            </div>

            {/* NEW REQUIREMENT: Project Selection */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>
                المشروع المستهدف (الموقع) - لتصفية وتصفيط الحسابات آلياً
              </label>
              <select
                className="form-control"
                style={{ fontWeight: 700 }}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">-- معدة عامة / غير مرتبطة بمشروع معين --</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    🏗️ {p.code} - {p.name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>
                عند اختيار مشروع، يتم إضافة تكلفة المصروف آلياً في كلفة ومصروفات هذا المشروع
              </span>
            </div>

            <div className="grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">نوع البند</label>
                <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="سولار ووقود">سولار ووقود</option>
                  <option value="صيانة وقطع غيار">صيانة وقطع غيار</option>
                  <option value="تغيير زيوت وفلاتر">تغيير زيوت وفلاتر</option>
                  <option value="إيجار معدة خارجية">إيجار معدة خارجية</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">التكلفة (جنيه) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">تاريخ المصروف *</label>
              <input
                type="date"
                className="form-control"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">البيان والشرح</label>
              <input
                type="text"
                className="form-control"
                placeholder="شرح الإجراء أو شحنة السولار..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات إضافية</label>
              <input
                type="text"
                className="form-control"
                placeholder="رقم الفاتورة أو المورد..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/equipment-expenses" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ وتخصيص المصروف للمشروع"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
