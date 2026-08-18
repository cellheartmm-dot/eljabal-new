"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateEquipmentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Required Fields:
  // اسم المعدة * (حفار، رافعة، خلاطة...)
  // الكود (EQ-001)
  // الحالة (يعمل)
  // تاريخ الشراء (mm/dd/yyyy)
  // ملاحظات
  const [name, setName] = useState("");
  const [code, setCode] = useState("EQ-001");
  const [status, setStatus] = useState("يعمل");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/equipment")
      .then((res) => res.json())
      .then((data) => {
        if (data?.nextCode) {
          setCode(data.nextCode);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          status,
          purchaseDate,
          notes,
        }),
      });

      if (res.ok) {
        router.push("/equipment");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🚛 تسجيل معدة / آلة جديدة</h1>
          <p className="page-subtitle">إدخال بيانات معدة أو آلة جديدة بأسرع شكل</p>
        </div>
        <Link href="/equipment" className="btn btn-ghost">
          ← العودة للمعدات
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* 1. اسم المعدة * */}
            <div className="form-group">
              <label className="form-label">اسم المعدة *</label>
              <input
                type="text"
                className="form-control"
                placeholder="مثال: حفار، رافعة، خلاطة..."
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 2. الكود + 3. الحالة */}
            <div className="grid-2" style={{ gap: 14 }}>
              <div className="form-group">
                <label className="form-label">الكود</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="EQ-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الحالة</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="يعمل">يعمل</option>
                  <option value="تحت الصيانة">تحت الصيانة</option>
                  <option value="متوقف">متوقف</option>
                </select>
              </div>
            </div>

            {/* 4. تاريخ الشراء */}
            <div className="form-group">
              <label className="form-label">تاريخ الشراء</label>
              <input
                type="date"
                className="form-control"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            {/* 5. ملاحظات */}
            <div className="form-group">
              <label className="form-label">ملاحظات</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="أي ملاحظات أو مواصفات فنية إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/equipment" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ المعدة والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
