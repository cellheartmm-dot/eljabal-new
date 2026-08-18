"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateSubcontractorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("أعمال المحارة والتشطيبات");
  const [phone, setPhone] = useState("");
  const [commercialRegNo, setCommercialRegNo] = useState("");
  const [status, setStatus] = useState("نشط");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/subcontractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          specialty,
          phone,
          commercialRegNo,
          status,
          notes,
        }),
      });

      if (res.ok) {
        router.push("/subcontractors");
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
          <h1 className="page-title">🔧 إضافة مقاول باطن جديد</h1>
          <p className="page-subtitle">تسجيل مقاول باطن جديد أو شركة تنفيذ فرعية مع تتبع السجل التجاري والعقد</p>
        </div>
        <Link href="/subcontractors" className="btn btn-ghost">
          ← العودة للمقاولين
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">اسم المقاول / اسم الشركة *</label>
              <input
                type="text"
                className="form-control"
                placeholder="مثال: شركة السلام للمقاولات والتوريدات"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">رقم السجل التجاري (اختياري - للشركات)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="مثال: 102984 (إن وجد)"
                  value={commercialRegNo}
                  onChange={(e) => setCommercialRegNo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم التواصل</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">التخصص / نوع الأعمال</label>
                <select className="form-control" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                  <option value="أعمال المحارة والتشطيبات">أعمال المحارة والتشطيبات</option>
                  <option value="أعمال السباكة والصحي">أعمال السباكة والصحي</option>
                  <option value="أعمال الكهرباء وتمديدات الشبكات">أعمال الكهرباء وتمديدات الشبكات</option>
                  <option value="أعمال العزل والرخام">أعمال العزل والرخام</option>
                  <option value="أعمال الحفر والردم">أعمال الحفر والردم</option>
                  <option value="أعمال الحداده">أعمال الحداده</option>
                  <option value="أعمال الحداده والمسلح">أعمال الحداده والمسلح</option>
                  <option value="أعمال النجاره">أعمال النجاره</option>
                  <option value="أعمال المبانى">أعمال المبانى</option>
                  <option value="أعمال الدهان">أعمال الدهان</option>
                  <option value="أعمال الفاير">أعمال الفاير</option>
                  <option value="أعمال الديكور">أعمال الديكور</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الحالة *</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="نشط">نشط</option>
                  <option value="متوقف">متوقف</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات</label>
              <input
                type="text"
                className="form-control"
                placeholder="ملاحظات تفصيلية حول العقد أو الأعمال..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/subcontractors" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ بيانات المقاول والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
