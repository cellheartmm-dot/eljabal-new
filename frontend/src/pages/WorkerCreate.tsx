import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

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

export default function WorkerCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const editId = searchParams.get("edit");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [specialties, setSpecialties] = useState<string[]>(DEFAULT_SPECIALTIES);
  const [specialty, setSpecialty] = useState("نجار مسلح");
  const [isCustomSpecialty, setIsCustomSpecialty] = useState(false);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const stored = localStorage.getItem("worker_specialties");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSpecialties(Array.from(new Set([...DEFAULT_SPECIALTIES, ...parsed])));
          }
        }
      } catch (e) {
        console.error(e);
      }

      if (editId) {
        setLoading(true);
        try {
          const { data: w, error } = await supabase
            .from("Worker")
            .select("*")
            .eq("id", editId)
            .single();

          if (error) throw error;
          if (w) {
            setName(w.name || "");
            setSpecialty(w.specialty || "نجار مسلح");
            setDailyRate(w.dailyRate?.toString() || "");
            setPhone(w.phone || "");
            setNationalId(w.nationalId || "");
            setIsActive(w.isActive ?? true);
          }
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalSpecialty = specialty;

    if (isCustomSpecialty) {
      const trimmed = customSpecialty.trim();
      if (!trimmed) {
        showToast("برجاء أدخال اسم المهنة الجديدة", "warning");
        return;
      }
      finalSpecialty = trimmed;
      if (!specialties.includes(trimmed)) {
        const updated = [...specialties, trimmed];
        setSpecialties(updated);
        localStorage.setItem("worker_specialties", JSON.stringify(updated));
      }
    }

    if (!name || !dailyRate) {
      showToast("برجاء إدخال اسم العامل والأجر اليومي", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        specialty: finalSpecialty,
        dailyRate: parseFloat(dailyRate),
        phone,
        nationalId,
        isActive,
      };

      if (editId) {
        const { error } = await supabase.from("Worker").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تحديث بيانات العامل بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("Worker").insert([payload]);
        if (error) throw error;
        showToast("تم إضافة العامل بنجاح ✅", "success");
      }

      setTimeout(() => {
        navigate("/workers");
      }, 500);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ البيانات", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">{editId ? "✏️ تعديل بيانات العامل" : "👷 إضافة عامل جديد"}</h1>
          <p className="page-subtitle">تسجيل بيانات العامل، الأجر اليومي، والمهنة</p>
        </div>
        <Link to="/workers" className="btn btn-ghost">
          ← إلغاء والعودة
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 650, margin: "0 auto", padding: 24 }}>
        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 30, height: 30 }} />
            <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل البيانات...</div>
          </div>
        ) : (
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

            <div className="grid-2" style={{ gap: 16 }}>
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
                      + مهنة جديدة
                    </button>
                  )}
                </div>

                {!isCustomSpecialty ? (
                  <select
                    className="form-control"
                    value={specialty}
                    onChange={(e) => {
                      if (e.target.value === "__ADD__") {
                        setIsCustomSpecialty(true);
                      } else {
                        setSpecialty(e.target.value);
                      }
                    }}
                  >
                    {specialties.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="__ADD__">➕ إضافة مهنة جديدة...</option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="المهنة الجديدة..."
                      required
                      value={customSpecialty}
                      onChange={(e) => setCustomSpecialty(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
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
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  required
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
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

            <div className="form-group">
              <label className="form-label">الحالة</label>
              <select className="form-control" value={isActive ? "true" : "false"} onChange={(e) => setIsActive(e.target.value === "true")}>
                <option value="true">نشط (يعمل بالموقع)</option>
                <option value="false">غير نشط (متوقف)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <Link to="/workers" className="btn btn-ghost">
                إلغاء
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : editId ? "تحديث التعديلات" : "حفظ بيانات العامل"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
