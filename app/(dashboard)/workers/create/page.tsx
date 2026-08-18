"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEFAULT_SPECIALTIES = [
  "نجار مسلح",
  "حداد مسلح",
  "بناء",
  "كهربائي",
  "سباك",
  "نقاش",
  "عامل عادي",
  "سائق معدات",
  "مبلط",
  "ملحي / مبيض محارة",
  "فني تكييف",
];

export default function CreateWorkerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [specialties, setSpecialties] = useState<string[]>(DEFAULT_SPECIALTIES);
  const [specialty, setSpecialty] = useState("نجار مسلح");
  const [isCustomSpecialty, setIsCustomSpecialty] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState("");

  const [dailyRate, setDailyRate] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("worker_specialties");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const merged = Array.from(new Set([...DEFAULT_SPECIALTIES, ...parsed]));
          setSpecialties(merged);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSpecialtyChange = (val: string) => {
    if (val === "__ADD_NEW__") {
      setIsCustomSpecialty(true);
    } else {
      setIsCustomSpecialty(false);
      setSpecialty(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSpecialty = specialty;
    if (isCustomSpecialty) {
      const trimmed = customSpecialty.trim();
      if (!trimmed) return;
      finalSpecialty = trimmed;

      if (!specialties.includes(trimmed)) {
        const updated = [...specialties, trimmed];
        setSpecialties(updated);
        try {
          localStorage.setItem("worker_specialties", JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          specialty: finalSpecialty,
          dailyRate,
          phone,
          nationalId,
        }),
      });
      if (res.ok) {
        router.push("/workers");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">👷 إضافة عامل جديد</h1>
          <p className="page-subtitle">تسجيل عامل جديد وتحديد الأجر اليومي والتخصص</p>
        </div>
        <Link href="/workers" className="btn btn-ghost">
          ← العودة للعمال
        </Link>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">اسم العامل بالكامل *</label>
              <input
                type="text"
                className="form-control"
                placeholder="مثال: أحمد محمد علي"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">التخصص / المهنة *</label>
                  {!isCustomSpecialty && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: "0 6px", color: "hsl(var(--gold))" }}
                      onClick={() => setIsCustomSpecialty(true)}
                    >
                      + إضافة مهنة جديدة
                    </button>
                  )}
                </div>

                {!isCustomSpecialty ? (
                  <select
                    className="form-control"
                    value={specialty}
                    onChange={(e) => handleSpecialtyChange(e.target.value)}
                  >
                    {specialties.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="__ADD_NEW__">➕ إضافة تخصص / مهنة جديدة...</option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="أدخل اسم المهنة الجديدة (مثال: فني ألوميتال)"
                      required
                      value={customSpecialty}
                      onChange={(e) => setCustomSpecialty(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, whiteSpace: "nowrap" }}
                      onClick={() => {
                        setIsCustomSpecialty(false);
                        setCustomSpecialty("");
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">الأجر اليومي (جنيه) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0.00"
                  required
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="01xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">الرقم القومي</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="14 رقم"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <Link href="/workers" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ البيانات والتأكيد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
