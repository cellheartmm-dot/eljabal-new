"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateSupervisorPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salaryType, setSalaryType] = useState("شهري");
  const [salary, setSalary] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().split("T")[0]);
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/supervisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          salaryType,
          salary,
          hireDate,
          isActive,
        }),
      });

      if (res.ok) {
        router.push("/supervisors");
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
          <h1 className="page-title">👔 إضافة مشرف موقع جديد</h1>
          <p className="page-subtitle">تعيين مشرف أو مهندس جديد بالشركة وتصنيف نظامه المالي</p>
        </div>
        <Link href="/supervisors" className="btn btn-ghost">
          ← العودة للمشرفين
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">الاسم بالكامل *</label>
              <input
                type="text"
                className="form-control"
                placeholder="أدخل اسم المشرف بالكامل"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">نظام الراتب *</label>
                <select className="form-control" value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
                  <option value="شهري">شهري</option>
                  <option value="يومي">يومي</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  {salaryType === "يومي" ? "الراتب اليومي (جنيه)" : "الراتب الشهري (جنيه)"}
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0.00"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">تاريخ التعيين</label>
                <input
                  type="date"
                  className="form-control"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">الحالة</label>
              <select
                className="form-control"
                value={isActive ? "true" : "false"}
                onChange={(e) => setIsActive(e.target.value === "true")}
              >
                <option value="true">نشط</option>
                <option value="false">متوقف</option>
              </select>
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/supervisors" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ المشرف والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
