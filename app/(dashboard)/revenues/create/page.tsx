"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateRevenuePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form fields:
  // التاريخ (07/28/2026)
  // المشروع (اختيارى) - بدون مشروع
  // نوع الإيراد * - اختر
  // طريقة الدفع - نقدى
  // البيان
  // المبلغ *
  // ملاحظات
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");
  const [type, setType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        const pList = Array.isArray(data) ? data : data?.projects || [];
        setProjects(pList);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !amount) return;

    const targetProj = projects.find((p) => p.id === projectId);
    const projNameText = targetProj ? targetProj.name : "بدون مشروع";

    setSubmitting(true);
    try {
      const res = await fetch("/api/revenues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          projectId: projectId || null,
          projectName: projNameText,
          type,
          paymentMethod,
          description: description || `إيراد ${type}`,
          amount,
          notes,
        }),
      });

      if (res.ok) {
        router.push("/revenues");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 تسجيل إيراد / دفعة واردة جديدة</h1>
          <p className="page-subtitle">إدخال كافة بيانات الدفعة المقبوضة أو المستخلص الوارد</p>
        </div>
        <Link href="/revenues" className="btn btn-ghost">
          ← العودة للإيرادات
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* 1. التاريخ */}
            <div className="form-group">
              <label className="form-label">التاريخ *</label>
              <input
                type="date"
                className="form-control"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* 2. المشروع (اختياري) */}
            <div className="form-group">
              <label className="form-label">المشروع (اختياري)</label>
              <select
                className="form-control"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">بدون مشروع</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 3. نوع الإيراد * + 4. طريقة الدفع */}
            <div className="grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">نوع الإيراد *</label>
                <select
                  className="form-control"
                  required
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="" disabled>اختر نوع الإيراد</option>
                  <option value="مستخلص أعمال">مستخلص أعمال</option>
                  <option value="دفعة مقدمة">دفعة مقدمة</option>
                  <option value="استرداد تأمينات">استرداد تأمينات</option>
                  <option value="بيع خامات/تخريد">بيع خامات/تخريد</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">طريقة الدفع</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="نقدي">نقدي</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="شيك بنكي">شيك بنكي</option>
                  <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                </select>
              </div>
            </div>

            {/* 5. البيان */}
            <div className="form-group">
              <label className="form-label">البيان</label>
              <input
                type="text"
                className="form-control"
                placeholder="شرح الإيراد أو تفاصيل المستخلص..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 6. المبلغ * */}
            <div className="form-group">
              <label className="form-label">المبلغ *</label>
              <input
                type="number"
                className="form-control"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* 7. ملاحظات */}
            <div className="form-group">
              <label className="form-label">ملاحظات</label>
              <input
                type="text"
                className="form-control"
                placeholder="أي ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/revenues" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ الإيراد والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
