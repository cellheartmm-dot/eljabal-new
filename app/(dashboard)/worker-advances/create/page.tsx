"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateWorkerAdvancePage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("مدفوع");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/workers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkers(data);
          if (data.length > 0) {
            setWorkerId(data[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/worker-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          amount,
          date,
          status,
          notes,
        }),
      });

      if (res.ok) {
        router.push("/worker-advances");
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
          <h1 className="page-title">💵 تسجيل سلفة مالية لعامل</h1>
          <p className="page-subtitle">إدخال بيان سلفة جديدة لعامل بالشركة</p>
        </div>
        <Link href="/worker-advances" className="btn btn-ghost">
          ← العودة للسلف
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
                onChange={(e) => setWorkerId(e.target.value)}
              >
                <option value="" disabled>-- اختر العامل من القائمة --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.specialty || "عامل"})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">مبلغ السلفة (جنيه) *</label>
              <input
                type="number"
                className="form-control"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid-2">
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
                <label className="form-label">حالة السلفة</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="مدفوع">مدفوع (تم الصرف)</option>
                  <option value="معلق">معلق</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">سبب السلفة / ملاحظات</label>
              <input
                type="text"
                className="form-control"
                placeholder="ملاحظات حول طريقة السداد..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/worker-advances" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "تسجيل السلفة والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
