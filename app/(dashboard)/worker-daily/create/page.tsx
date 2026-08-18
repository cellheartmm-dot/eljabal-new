"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateWorkerDailyPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [workerId, setWorkerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("حاضر");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Fetch workers
    fetch("/api/workers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkers(data);
          if (data.length > 0) {
            setWorkerId(data[0].id);
            setAmount(data[0].dailyRate?.toString() || "");
          }
        }
      })
      .catch(console.error);

    // Fetch projects
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.projects || [];
        setProjects(list);
      })
      .catch(console.error);
  }, []);

  const handleWorkerSelect = (id: string) => {
    setWorkerId(id);
    const target = workers.find((w) => w.id === id);
    if (target?.dailyRate) {
      setAmount(target.dailyRate.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/worker-dailies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          projectId: projectId || null,
          status,
          amount,
          date,
          notes,
        }),
      });

      if (res.ok) {
        router.push("/worker-daily");
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
          <h1 className="page-title">📅 تسجيل يومية عامل جديدة</h1>
          <p className="page-subtitle">إدخال حالة حضور أو غياب يومية لعامل بالـموقع</p>
        </div>
        <Link href="/worker-daily" className="btn btn-ghost">
          ← العودة لليوميات
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">اختر العامل *</label>
              <select
                className="form-control"
                required
                value={workerId}
                onChange={(e) => handleWorkerSelect(e.target.value)}
              >
                <option value="" disabled>-- اختر العامل من القائمة --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.specialty || "عامل"}) - اليومية: {w.dailyRate} ج.م
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">المشروع</label>
              <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">-- اختر المشروع (اختياري) --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">حالة الحضور</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="حاضر">حاضر (يوم كامل)</option>
                  <option value="نصف يوم">نصف يوم</option>
                  <option value="وقت إضافي">وقت إضافي</option>
                  <option value="غائب">غائب</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">المبلغ المستحق (جنيه) *</label>
                <input
                  type="number"
                  className="form-control"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">التاريخ</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات أو موقع العمل</label>
              <input
                type="text"
                className="form-control"
                placeholder="مثال: موقع البرج السكني"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/worker-daily" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ اليومية والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
